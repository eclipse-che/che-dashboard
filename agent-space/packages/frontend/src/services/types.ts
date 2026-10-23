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

/**
 * Types for the `agents.x-k8s.io` Sandbox resource.
 * See https://agent-sandbox.sigs.k8s.io/ and
 * https://github.com/kubernetes-sigs/agent-sandbox
 */

export const SANDBOX_API_GROUP = 'agents.x-k8s.io';
export const SANDBOX_API_VERSION = 'v1beta1';
export const SANDBOX_API_VERSION_FULL = `${SANDBOX_API_GROUP}/${SANDBOX_API_VERSION}`;
export const SANDBOX_KIND = 'Sandbox';
export const SANDBOX_PLURAL = 'sandboxes';

export type ResourceList = {
  cpu?: string;
  memory?: string;
  'ephemeral-storage'?: string;
};

/** Reads one key of a Secret. The key may be absent when `optional` is set. */
export interface SecretKeySelector {
  name: string;
  key: string;
  optional?: boolean;
}

export interface SandboxEnvVar {
  name: string;
  /** Literal value. Mutually exclusive with {@link SandboxEnvVar.valueFrom}. */
  value?: string;
  valueFrom?: {
    secretKeyRef?: SecretKeySelector;
  };
}

export interface SandboxVolumeMount {
  name: string;
  mountPath: string;
  subPath?: string;
  readOnly?: boolean;
}

export interface SandboxContainerPort {
  name?: string;
  containerPort: number;
  protocol?: string;
}

export interface SandboxContainer {
  name: string;
  image: string;
  command?: string[];
  args?: string[];
  env?: SandboxEnvVar[];
  ports?: SandboxContainerPort[];
  volumeMounts?: SandboxVolumeMount[];
  workingDir?: string;
  resources?: {
    limits?: ResourceList;
    requests?: ResourceList;
  };
}

/**
 * The volume sources the wizard and the samples use. Not the whole core/v1
 * union - a shape the UI never writes is a shape it cannot get wrong.
 */
export interface SandboxVolume {
  name: string;
  emptyDir?: { medium?: string; sizeLimit?: string };
  persistentVolumeClaim?: { claimName: string; readOnly?: boolean };
  secret?: { secretName: string; optional?: boolean; defaultMode?: number };
  configMap?: { name: string; optional?: boolean; defaultMode?: number };
}

/**
 * Pod-level security context.
 *
 * Leave it unset on OpenShift: the `restricted-v2` SCC assigns a UID from the
 * namespace range and rejects a pod that asks for one outside it.
 */
export interface SandboxPodSecurityContext {
  runAsUser?: number;
  runAsGroup?: number;
  runAsNonRoot?: boolean;
  fsGroup?: number;
  seccompProfile?: { type: string };
}

export interface SandboxPodSpec {
  runtimeClassName?: string;
  restartPolicy?: string;
  automountServiceAccountToken?: boolean;
  serviceAccountName?: string;
  securityContext?: SandboxPodSecurityContext;
  initContainers?: SandboxContainer[];
  containers: SandboxContainer[];
  volumes?: SandboxVolume[];
}

/**
 * `Suspended` tears the pod down and keeps the volumes; `Running` brings it
 * back. This is the only lifecycle switch the v1beta1 API has - there is no
 * `replicas` and no `shutdown` field.
 */
export type SandboxOperatingMode = 'Running' | 'Suspended';

/**
 * A claim the controller provisions for the sandbox, StatefulSet-style.
 *
 * The container mounts it by the template name - the controller adds the
 * matching `volumes` entry to the pod itself. Immutable after creation.
 */
export interface PersistentVolumeClaimTemplate {
  metadata: {
    name: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec: {
    accessModes?: string[];
    storageClassName?: string;
    resources?: {
      requests?: {
        storage?: string;
      };
    };
  };
}

export interface SandboxSpec {
  podTemplate: {
    metadata?: {
      labels?: Record<string, string>;
      annotations?: Record<string, string>;
    };
    spec: SandboxPodSpec;
  };
  /** Storage provisioned per sandbox; survives a suspend/resume cycle. */
  volumeClaimTemplates?: PersistentVolumeClaimTemplate[];
  operatingMode?: SandboxOperatingMode;
  /** When true, the controller creates a headless Service for the pod. */
  service?: boolean;
  /** When the sandbox expires. Unset means it never does. */
  shutdownTime?: string;
  /** What happens to the object at expiry. The pod and the Service always go. */
  shutdownPolicy?: 'Delete' | 'Retain';
}

export type ConditionStatus = 'True' | 'False' | 'Unknown';

export interface SandboxCondition {
  type: string;
  status: ConditionStatus;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
  observedGeneration?: number;
}

export interface SandboxStatus {
  conditions?: SandboxCondition[];
  /** Name of the Service the controller created for the sandbox. */
  service?: string;
  serviceFQDN?: string;
  observedGeneration?: number;
  nodeName?: string;
  podIPs?: string[];
}

export interface SandboxMetadata {
  name: string;
  namespace?: string;
  uid?: string;
  generation?: number;
  resourceVersion?: string;
  creationTimestamp?: string;
  deletionTimestamp?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface Sandbox {
  apiVersion?: string;
  kind?: string;
  metadata: SandboxMetadata;
  spec: SandboxSpec;
  status?: SandboxStatus;
}

/**
 * Body of a merge patch (RFC 7386), as `patchSandbox` sends it.
 *
 * It is not a `Partial<Sandbox>`: an annotation is removed by sending `null`
 * for its key, which a `Record<string, string>` cannot express. Omitting the
 * key leaves whatever is on the server in place.
 */
export interface SandboxPatch {
  metadata?: {
    labels?: Record<string, string | null>;
    annotations?: Record<string, string | null>;
  };
  spec?: Partial<SandboxSpec>;
}

export interface SandboxList {
  apiVersion?: string;
  kind?: string;
  metadata?: {
    resourceVersion?: string;
  };
  items: Sandbox[];
}

/**
 * Subset of a Kubernetes core/v1 Event, as rendered on the details page.
 */
export interface SandboxEvent {
  uid: string;
  type?: string;
  reason?: string;
  message?: string;
  count?: number;
  lastTimestamp?: string;
  firstTimestamp?: string;
  reportingComponent?: string;
}

/**
 * Lifecycle phase derived from spec + status. The controller does not publish a
 * single phase field, so {@link getSandboxPhase} folds the conditions into one.
 */
export enum SandboxPhase {
  RUNNING = 'Running',
  PENDING = 'Pending',
  SUSPENDED = 'Suspended',
  /** The pod ran to completion and will not be restarted on its own. */
  COMPLETED = 'Completed',
  FAILED = 'Failed',
  BLOCKED = 'Blocked',
  EXPIRED = 'Expired',
  TERMINATING = 'Terminating',
}

/** Actions that are one patch of `spec.operatingMode` and nothing more. */
export type SandboxOperatingModeAction = 'suspend' | 'resume';

export type SandboxAction = SandboxOperatingModeAction | 'restart';

/**
 * Error raised by the sandbox clients. Carries the HTTP status code so callers
 * can tell "not found" from "forbidden" without matching on message strings.
 */
export class SandboxClientError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly reason?: string,
  ) {
    super(message);
    this.name = 'SandboxClientError';
  }
}

/**
 * Plain-object form of {@link SandboxClientError}.
 *
 * Errors are rendered from the Redux store, and an `Error` instance is not
 * serializable, so the thunks convert on the way in and keep the status code
 * the UI needs to turn a failure into advice.
 */
export interface SandboxError {
  message: string;
  statusCode?: number;
  reason?: string;
}

export function toSandboxError(e: unknown): SandboxError {
  if (e instanceof SandboxClientError) {
    return { message: e.message, statusCode: e.statusCode, reason: e.reason };
  }
  if (e instanceof Error) {
    return { message: e.message };
  }
  return { message: String(e) };
}

/**
 * Whether a create failed because the object is already there.
 *
 * A 409 also carries `Conflict` - a stale resource version on an update - so
 * the reason decides whenever the API server sends one.
 */
export function isAlreadyExistsError(e: unknown): boolean {
  if (!(e instanceof SandboxClientError)) {
    return false;
  }
  return e.reason === undefined ? e.statusCode === 409 : e.reason === 'AlreadyExists';
}

/**
 * What a watch reports. `ERROR` means the stream broke - the caller has to
 * list again to resynchronise, because events may have been missed.
 */
export type SandboxChangeEvent = {
  type: 'ADDED' | 'MODIFIED' | 'DELETED';
  sandbox: Sandbox;
};

export type SandboxWatchEvent = SandboxChangeEvent | { type: 'ERROR'; message: string };

export type SandboxWatchListener = (event: SandboxWatchEvent) => void;

/** Stops a watch. Calling it twice is safe. */
export type StopWatching = () => void;

export interface AgentSandboxClient {
  /** 'cluster' talks to a real API server, 'mock' keeps everything in memory. */
  readonly mode: 'cluster' | 'mock';
  /**
   * The whole list object, not only its items: the `resourceVersion` of the
   * collection is where a watch has to start from.
   */
  listSandboxes(namespace: string): Promise<SandboxList>;
  getSandbox(namespace: string, name: string): Promise<Sandbox>;
  createSandbox(namespace: string, sandbox: Sandbox): Promise<Sandbox>;
  deleteSandbox(namespace: string, name: string): Promise<void>;
  patchSandbox(namespace: string, name: string, patch: SandboxPatch): Promise<Sandbox>;
  listEvents(namespace: string, name: string): Promise<SandboxEvent[]>;
  /** Namespaces the user may pick from; empty when listing is not permitted. */
  listNamespaces(): Promise<string[]>;
  /**
   * Streams changes to the sandboxes of a namespace, starting after
   * `resourceVersion` - the one the matching list call returned.
   */
  watchSandboxes(
    namespace: string,
    resourceVersion: string,
    listener: SandboxWatchListener,
  ): StopWatching;
}
