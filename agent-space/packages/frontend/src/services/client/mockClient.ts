/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import {
  AgentSandboxClient,
  Sandbox,
  SANDBOX_API_VERSION_FULL,
  SANDBOX_KIND,
  SandboxClientError,
  SandboxCondition,
  SandboxEvent,
  SandboxList,
  SandboxPatch,
  SandboxWatchEvent,
  SandboxWatchListener,
  StopWatching,
} from '@/services/types';

const DEFAULT_NAMESPACE = 'user-devspaces';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** RFC 7386 on one map: a `null` removes the key, anything else sets it. */
function mergeAnnotations(
  current: Record<string, string> | undefined,
  patch: Record<string, string | null> | undefined,
): Record<string, string> | undefined {
  if (patch === undefined) {
    return current;
  }
  const merged: Record<string, string> = { ...current };
  for (const [annotation, value] of Object.entries(patch)) {
    if (value === null) {
      delete merged[annotation];
    } else {
      merged[annotation] = value;
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

function key(namespace: string, name: string): string {
  return `${namespace}/${name}`;
}

function buildSandbox(namespace: string, name: string): Sandbox {
  return {
    apiVersion: SANDBOX_API_VERSION_FULL,
    kind: SANDBOX_KIND,
    metadata: {
      name,
      namespace,
      uid: `uid-${name}`,
      generation: 1,
      creationTimestamp: new Date(Date.now() - 36e5).toISOString(),
    },
    spec: {
      operatingMode: 'Running',
      service: true,
      podTemplate: {
        spec: {
          runtimeClassName: 'gvisor',
          restartPolicy: 'Never',
          automountServiceAccountToken: false,
          containers: [
            {
              name: 'workspace',
              image: 'ghcr.io/openclaw/openclaw:2026.3.23',
              resources: {
                limits: { cpu: '2', memory: '4Gi' },
                requests: { cpu: '500m', memory: '1Gi' },
              },
            },
          ],
        },
      },
    },
    status: {
      conditions: readyConditions(new Date(Date.now() - 18e5).toISOString()),
      service: name,
      serviceFQDN: `${name}.${namespace}.svc.cluster.local`,
      nodeName: 'worker-1',
    },
  };
}

/**
 * The condition set a healthy sandbox carries, in the shape and with the
 * reasons the controller really writes - the fixtures here are what the tests
 * assert against, so a condition the controller cannot produce would make the
 * suite agree with itself rather than with the cluster.
 */
function readyConditions(lastTransitionTime: string): SandboxCondition[] {
  return [
    {
      type: 'Suspended',
      status: 'False',
      reason: 'NotSuspended',
      message: 'Sandbox is not suspended',
      lastTransitionTime,
    },
    {
      type: 'PodScheduled',
      status: 'True',
      reason: 'PodScheduled',
      message: 'Pod is scheduled',
      lastTransitionTime,
    },
    {
      type: 'Ready',
      status: 'True',
      reason: 'DependenciesReady',
      message: 'Sandbox pod is running and ready.',
      lastTransitionTime,
    },
  ];
}

function seed(namespace: string): Sandbox[] {
  const running = buildSandbox(namespace, 'hello-world');

  const suspended = buildSandbox(namespace, 'openclaw-agent');
  suspended.spec.operatingMode = 'Suspended';
  suspended.status = {
    conditions: [
      {
        type: 'Ready',
        status: 'False',
        reason: 'SandboxSuspended',
        message: 'Sandbox is suspended.',
        lastTransitionTime: new Date(Date.now() - 72e5).toISOString(),
      },
      {
        type: 'Suspended',
        status: 'True',
        reason: 'PodTerminated',
        message: 'Pod has been terminated.',
        lastTransitionTime: new Date(Date.now() - 72e5).toISOString(),
      },
    ],
  };

  // A sandbox the scheduler refused. The cause is on `PodScheduled`, with the
  // reason kube-scheduler wrote; `Ready` only says the pod is not up yet.
  const blocked = buildSandbox(namespace, 'nemoclaw-sandbox');
  blocked.spec.podTemplate.spec.runtimeClassName = 'kata-qemu';
  blocked.status = {
    conditions: [
      {
        type: 'Suspended',
        status: 'False',
        reason: 'NotSuspended',
        message: 'Sandbox is not suspended',
        lastTransitionTime: new Date(Date.now() - 6e5).toISOString(),
      },
      {
        type: 'PodScheduled',
        status: 'False',
        reason: 'Unschedulable',
        message:
          '0/1 nodes are available: 1 node(s) didn\'t match pod\'s runtime class "kata-qemu". ' +
          'preemption: 0/1 nodes are available: 1 Preemption is not helpful for scheduling.',
        lastTransitionTime: new Date(Date.now() - 6e5).toISOString(),
      },
      {
        type: 'Ready',
        status: 'False',
        reason: 'DependenciesNotReady',
        message: 'Pod exists with phase: Pending',
        lastTransitionTime: new Date(Date.now() - 6e5).toISOString(),
      },
    ],
  };

  // A sandbox whose container ran to completion - the state a plain image
  // without a long-running command ends up in.
  const completed = buildSandbox(namespace, 'sandboxed-tools');
  completed.status = {
    conditions: [
      {
        type: 'Ready',
        status: 'False',
        reason: 'PodSucceeded',
        message: 'Pod completed successfully',
        lastTransitionTime: new Date(Date.now() - 3e5).toISOString(),
      },
      {
        type: 'Finished',
        status: 'True',
        reason: 'PodSucceeded',
        message: 'Pod completed successfully',
        lastTransitionTime: new Date(Date.now() - 3e5).toISOString(),
      },
    ],
  };

  return [running, suspended, blocked, completed];
}

/**
 * In-memory stand-in for the Kubernetes API.
 *
 * It keeps the whole MVP usable on clusters where the agent-sandbox controller
 * is not installed, and it is what the unit tests run against. Newly created
 * sandboxes become Ready after a short delay so status polling has something
 * to observe.
 */
export class MockSandboxClient implements AgentSandboxClient {
  public readonly mode = 'mock' as const;

  private readonly sandboxes = new Map<string, Sandbox>();
  private readonly events = new Map<string, SandboxEvent[]>();
  private readonly namespace: string;
  /** Milliseconds a freshly created sandbox stays Pending. 0 disables the delay. */
  private readonly readyDelayMs: number;
  private readonly watchers = new Map<string, Set<SandboxWatchListener>>();

  constructor(namespace = DEFAULT_NAMESPACE, readyDelayMs = 4000) {
    this.namespace = namespace;
    this.readyDelayMs = readyDelayMs;
    for (const sandbox of seed(namespace)) {
      this.sandboxes.set(key(namespace, sandbox.metadata.name), sandbox);
    }
  }

  public async listSandboxes(namespace: string): Promise<SandboxList> {
    const items = [...this.sandboxes.values()]
      .filter(sandbox => sandbox.metadata.namespace === namespace)
      .map(sandbox => clone(sandbox));
    return { metadata: { resourceVersion: String(Date.now()) }, items };
  }

  /**
   * The demo client is its own watch: every mutation it performs - including
   * the delayed transition to Ready - is reported to the listeners, so the UI
   * is as live against the in-memory data as it is against a cluster.
   */
  public watchSandboxes(
    namespace: string,
    _resourceVersion: string,
    listener: SandboxWatchListener,
  ): StopWatching {
    const listeners = this.watchers.get(namespace) ?? new Set<SandboxWatchListener>();
    listeners.add(listener);
    this.watchers.set(namespace, listeners);

    return () => {
      listeners.delete(listener);
    };
  }

  private notify(namespace: string, event: SandboxWatchEvent): void {
    this.watchers.get(namespace)?.forEach(listener => listener(event));
  }

  public async getSandbox(namespace: string, name: string): Promise<Sandbox> {
    const sandbox = this.sandboxes.get(key(namespace, name));
    if (!sandbox) {
      throw new SandboxClientError(404, `Sandbox '${name}' not found.`, 'NotFound');
    }
    return clone(sandbox);
  }

  public async createSandbox(namespace: string, sandbox: Sandbox): Promise<Sandbox> {
    const name = sandbox.metadata.name;
    if (this.sandboxes.has(key(namespace, name))) {
      throw new SandboxClientError(409, `Sandbox '${name}' already exists.`, 'AlreadyExists');
    }

    const created = clone(sandbox);
    created.apiVersion = SANDBOX_API_VERSION_FULL;
    created.kind = SANDBOX_KIND;
    created.metadata = {
      ...created.metadata,
      namespace,
      uid: `uid-${name}-${Date.now()}`,
      generation: 1,
      creationTimestamp: new Date().toISOString(),
    };
    created.status = {
      conditions: [
        {
          type: 'Ready',
          status: 'False',
          reason: 'DependenciesNotReady',
          message: 'Waiting for the sandbox pod to start.',
          lastTransitionTime: new Date().toISOString(),
        },
      ],
    };

    this.sandboxes.set(key(namespace, name), created);
    this.notify(namespace, { type: 'ADDED', sandbox: clone(created) });
    this.events.set(key(namespace, name), [
      {
        uid: `${name}-created`,
        type: 'Normal',
        reason: 'Created',
        message: `Created sandbox ${name}.`,
        count: 1,
        lastTimestamp: new Date().toISOString(),
        reportingComponent: 'agent-sandbox-controller',
      },
    ]);

    if (this.readyDelayMs > 0) {
      setTimeout(() => this.markReady(namespace, name), this.readyDelayMs);
    } else {
      this.markReady(namespace, name);
    }

    return clone(created);
  }

  public async deleteSandbox(namespace: string, name: string): Promise<void> {
    const sandbox = this.sandboxes.get(key(namespace, name));
    if (!sandbox) {
      throw new SandboxClientError(404, `Sandbox '${name}' not found.`, 'NotFound');
    }
    this.sandboxes.delete(key(namespace, name));
    this.events.delete(key(namespace, name));
    this.notify(namespace, { type: 'DELETED', sandbox: clone(sandbox) });
  }

  public async patchSandbox(
    namespace: string,
    name: string,
    patch: SandboxPatch,
  ): Promise<Sandbox> {
    const sandbox = this.sandboxes.get(key(namespace, name));
    if (!sandbox) {
      throw new SandboxClientError(404, `Sandbox '${name}' not found.`, 'NotFound');
    }

    const patched: Sandbox = {
      ...sandbox,
      metadata: {
        ...sandbox.metadata,
        annotations: mergeAnnotations(sandbox.metadata.annotations, patch.metadata?.annotations),
      },
      spec: { ...sandbox.spec, ...(patch.spec ?? {}) },
    };
    patched.status = { ...sandbox.status, conditions: conditionsFor(patched) };

    this.sandboxes.set(key(namespace, name), patched);
    this.notify(namespace, { type: 'MODIFIED', sandbox: clone(patched) });
    return clone(patched);
  }

  public async listEvents(namespace: string, name: string): Promise<SandboxEvent[]> {
    return clone(this.events.get(key(namespace, name)) ?? defaultEvents(name));
  }

  public async listNamespaces(): Promise<string[]> {
    return [this.namespace];
  }

  private markReady(namespace: string, name: string): void {
    const sandbox = this.sandboxes.get(key(namespace, name));
    if (!sandbox) {
      return;
    }
    sandbox.status = {
      conditions: conditionsFor(sandbox),
      service: name,
      serviceFQDN: `${name}.${namespace}.svc.cluster.local`,
      nodeName: 'worker-1',
    };
    this.notify(namespace, { type: 'MODIFIED', sandbox: clone(sandbox) });
  }
}

/**
 * The conditions the controller would publish for a given spec. Only
 * `operatingMode` matters: v1beta1 has no other lifecycle switch.
 */
function conditionsFor(sandbox: Sandbox): SandboxCondition[] {
  const lastTransitionTime = new Date().toISOString();

  if (sandbox.spec.operatingMode === 'Suspended') {
    return [
      {
        type: 'Ready',
        status: 'False',
        reason: 'SandboxSuspended',
        message: 'Sandbox is suspended.',
        lastTransitionTime,
      },
      {
        type: 'Suspended',
        status: 'True',
        reason: 'PodTerminated',
        message: 'Pod has been terminated.',
        lastTransitionTime,
      },
    ];
  }

  return readyConditions(lastTransitionTime);
}

function defaultEvents(name: string): SandboxEvent[] {
  return [
    {
      uid: `${name}-scheduled`,
      type: 'Normal',
      reason: 'Scheduled',
      message: `Successfully assigned ${name} to node worker-1.`,
      count: 1,
      lastTimestamp: new Date(Date.now() - 12e5).toISOString(),
      reportingComponent: 'default-scheduler',
    },
    {
      uid: `${name}-pulled`,
      type: 'Normal',
      reason: 'Pulled',
      message: 'Container image already present on machine.',
      count: 1,
      lastTimestamp: new Date(Date.now() - 11e5).toISOString(),
      reportingComponent: 'kubelet',
    },
  ];
}
