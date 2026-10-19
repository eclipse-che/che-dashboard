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

import * as k8s from '@kubernetes/client-node';
import { PassThrough, Writable } from 'stream';

import { createError } from '@/devworkspaceClient/services/helpers/createError';
import {
  CoreV1API,
  prepareCoreV1API,
} from '@/devworkspaceClient/services/helpers/prepareCoreV1API';
import { SANDBOX_POD_LABEL } from '@/devworkspaceClient/services/sandboxApi';
import {
  ISandboxTerminalApi,
  ISandboxTerminalSession,
  SandboxTerminalHandlers,
  SandboxTerminalTarget,
} from '@/devworkspaceClient/types';

/**
 * Opens a shell in a sandbox pod over the Kubernetes `pods/exec` subresource.
 *
 * Every call is made with the requesting user's own token in the user's own
 * namespace, so the API server runs the authorisation: a user who may not exec
 * into the pod is refused by Kubernetes rather than by this code, and no
 * permission beyond what Che already grants is needed.
 *
 * The sandbox pod runs no terminal server of its own. The editor bundles
 * machine-exec, but it binds loopback and is reachable only by the editor
 * process beside it, so a terminal shown anywhere else has to come from the
 * API server instead.
 */

const TERMINAL_API_ERROR_LABEL = 'SANDBOX_TERMINAL_API_ERROR';

/**
 * Channel the API server expects a terminal resize on, fixed by the
 * `v4.channel.k8s.io` protocol: 0 stdin, 1 stdout, 2 stderr, 3 status,
 * 4 resize. The client library handles the first four itself but does not
 * export the constants, so this one is spelled out.
 */
const RESIZE_CHANNEL = 4;

/** Containers the dashboard added itself; never the one to drop a user into. */
const INFRASTRUCTURE_CONTAINERS = ['editor-proxy'];

/**
 * Prefers an interactive bash and settles for the shell every image has.
 *
 * Sandbox images are arbitrary - a sample may run `ubi-minimal` - so the shell
 * cannot be assumed. `exec` replaces the wrapper either way, which keeps the
 * signal handling and the exit status of a shell started directly.
 */
export const TERMINAL_COMMAND = ['/bin/sh', '-c', 'exec /bin/bash || exec /bin/sh'];

/** Phases a pod can serve a terminal in. */
const RUNNING_PHASE = 'Running';

export class SandboxTerminalApiService implements ISandboxTerminalApi {
  private readonly coreV1API: CoreV1API;
  private readonly exec: k8s.Exec;

  constructor(kubeConfig: k8s.KubeConfig) {
    this.coreV1API = prepareCoreV1API(kubeConfig);
    this.exec = new k8s.Exec(kubeConfig);
  }

  /**
   * Finds the pod and the container a sandbox's terminal belongs in.
   *
   * The pod is looked up by the label the UI writes, because that is what
   * identifies it regardless of how the controller chose to name it. A sandbox
   * created without an editor carries no such label, so the pod the controller
   * names after the sandbox is tried as well - that one has no editor and so
   * no terminal of its own, which is exactly the case this tab exists for.
   */
  async resolveTarget(namespace: string, sandboxName: string): Promise<SandboxTerminalTarget> {
    const pod = await this.findPod(namespace, sandboxName);

    const podName = pod.metadata?.name;
    if (podName === undefined) {
      throw createError(
        undefined,
        TERMINAL_API_ERROR_LABEL,
        `The pod of sandbox '${sandboxName}' has no name`,
      );
    }

    if (pod.status?.phase !== RUNNING_PHASE) {
      throw createError(
        undefined,
        TERMINAL_API_ERROR_LABEL,
        `The pod of sandbox '${sandboxName}' is ${pod.status?.phase ?? 'not running'}`,
      );
    }

    const containers = pod.spec?.containers ?? [];
    const container =
      containers.find(c => !INFRASTRUCTURE_CONTAINERS.includes(c.name)) ?? containers[0];
    if (container === undefined) {
      throw createError(
        undefined,
        TERMINAL_API_ERROR_LABEL,
        `The pod of sandbox '${sandboxName}' has no container`,
      );
    }

    return { podName, containerName: container.name };
  }

  private async findPod(namespace: string, sandboxName: string): Promise<k8s.V1Pod> {
    try {
      const { items } = await this.coreV1API.listNamespacedPod({
        namespace,
        labelSelector: `${SANDBOX_POD_LABEL}=${sandboxName}`,
      });
      // A sandbox that was suspended and resumed leaves the pod it had behind
      // for a while, so a running one is preferred over whichever came first.
      const running = items.find(pod => pod.status?.phase === RUNNING_PHASE);
      if (running !== undefined) {
        return running;
      }
      if (items.length > 0) {
        return items[0];
      }
    } catch (e) {
      throw createError(
        e,
        TERMINAL_API_ERROR_LABEL,
        `Unable to find the pod of sandbox '${sandboxName}'.`,
      );
    }

    try {
      return await this.coreV1API.readNamespacedPod({ namespace, name: sandboxName });
    } catch (e) {
      throw createError(
        e,
        TERMINAL_API_ERROR_LABEL,
        `Unable to find the pod of sandbox '${sandboxName}'.`,
      );
    }
  }

  /**
   * Starts a shell in the resolved container and returns the handle that
   * drives it. The handlers are called until `close()`, or until the shell
   * exits on its own.
   */
  async openSession(
    namespace: string,
    target: SandboxTerminalTarget,
    handlers: SandboxTerminalHandlers,
  ): Promise<ISandboxTerminalSession> {
    const output = new Writable({
      write(chunk: Buffer, _encoding, callback): void {
        handlers.onData(chunk.toString('utf8'));
        callback();
      },
    });

    // The shell reads from here; nothing is written until the browser sends a
    // keystroke, and ending it would end the session.
    const input = new PassThrough();

    let exitReason: string | undefined;

    const connection = await this.exec.exec(
      namespace,
      target.podName,
      target.containerName,
      TERMINAL_COMMAND,
      output,
      output,
      input,
      true,
      (status: k8s.V1Status) => {
        // A clean exit says Success and carries nothing worth showing.
        exitReason = status.status === 'Success' ? undefined : status.message;
      },
    );

    connection.on('close', () => handlers.onClose(exitReason));
    connection.on('error', (e: Error) => handlers.onClose(e.message));

    return {
      write(data: string): void {
        input.write(data);
      },

      resize(cols: number, rows: number): void {
        if (connection.readyState !== connection.OPEN) {
          return;
        }
        connection.send(
          Buffer.concat([
            Buffer.of(RESIZE_CHANNEL),
            Buffer.from(JSON.stringify({ Width: cols, Height: rows })),
          ]),
        );
      },

      close(): void {
        input.end();
        if (connection.readyState === connection.OPEN) {
          connection.close();
        }
      },
    };
  }
}
