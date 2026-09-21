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

import { api, DevWorkspaceStatus } from '@eclipse-che/common';

import { IDevWorkspaceApi, IKubeConfigApi, IPodmanApi } from '@/devworkspaceClient/types';
import { MessageListener } from '@/services/types/Observer';
import { logger } from '@/utils/logger';

// Safety net: if neither watch nor polling detected a terminal/running phase
// within 10 min, something is stuck — tear down to avoid leaking resources.
const OVERALL_TIMEOUT_MS = 600000;
// 2 s gives ~6 poll attempts within the ~12 s window that the UDI entrypoint.sh
// waits for ~/.kube/config before giving up and falling back to the pod SA token.
const POLL_INTERVAL_MS = 2000;
// The UDI entrypoint.sh waits ~12 s for ~/.kube/config.  If injection takes longer
// than this from when the workspace reached Running, the terminal has already fallen
// back to the pod service account identity.
const ENTRYPOINT_WINDOW_MS = 12000;

function isTerminalPhase(phase: string): boolean {
  return (
    phase === DevWorkspaceStatus.FAILED ||
    phase === DevWorkspaceStatus.FAILING ||
    phase === DevWorkspaceStatus.STOPPED ||
    phase === DevWorkspaceStatus.STOPPING ||
    phase === DevWorkspaceStatus.TERMINATING
  );
}

/**
 * Watches a specific DevWorkspace after it is started and injects
 * kubeconfig + podman credentials once it reaches the Running phase.
 *
 * Detection strategy (belt-and-suspenders):
 *   1. K8s Watch  — near-instant when the stream is healthy.
 *   2. Parallel polling (GET every 2 s) — reliable fallback when
 *      the watch stream is silently dropped by a proxy or LB.
 *   3. Immediate initial GET — catches workspaces that reached
 *      Running before the watch stream opened (LIST→STREAM race).
 *
 * All three paths race; whichever detects Running first injects
 * credentials and tears down the others.
 *
 * Guards:
 * - Only one session per workspace (keyed by namespace/name).
 * - Cleanup uses function identity (`isOwner`) to prevent a stale
 *   in-flight callback from tearing down a newer invocation.
 * - On: success, terminal phase, or overall timeout — everything is cleaned up.
 */
export class PostStartInjector {
  private static activeWatches = new Map<string, () => void>();

  static watchAndInject(
    namespace: string,
    workspaceName: string,
    devworkspaceApi: IDevWorkspaceApi,
    kubeConfigApi: IKubeConfigApi,
    podmanApi: IPodmanApi,
  ): void {
    const key = `${namespace}/${workspaceName}`;

    if (PostStartInjector.activeWatches.has(key)) {
      logger.info(`PostStartInjector: already active for ${key}, skipping`);
      return;
    }

    logger.info(
      `PostStartInjector: subscribing for ${key} — ` +
        `watch + poll every ${POLL_INTERVAL_MS / 1000}s, ` +
        `${OVERALL_TIMEOUT_MS / 1000}s overall timeout`,
    );

    const startedAt = Date.now();
    let pollHandle: ReturnType<typeof setInterval> | undefined;

    // Identity guard: prevents a stale callback from an older invocation
    // from tearing down a newer one that reuses the same key.
    const isOwner = (): boolean => PostStartInjector.activeWatches.get(key) === cleanup;

    const cleanup = (reason = 'external'): void => {
      if (!isOwner()) {
        return;
      }
      const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
      logger.info(
        `PostStartInjector: unsubscribing for ${key} — ${reason} (${elapsedSec}s elapsed)`,
      );
      devworkspaceApi.stopWatching();
      if (pollHandle !== undefined) {
        clearInterval(pollHandle);
        pollHandle = undefined;
      }
      PostStartInjector.activeWatches.delete(key);
    };

    PostStartInjector.activeWatches.set(key, cleanup);

    const timeoutHandle = setTimeout(() => {
      logger.warn(
        `PostStartInjector: overall ${OVERALL_TIMEOUT_MS / 1000}s timeout for ${key} — ` +
          `workspace may have started without kubeconfig injection. ` +
          `Check if the K8s Watch stream and polling GET were both blocked.`,
      );
      cleanup('timeout');
    }, OVERALL_TIMEOUT_MS);

    const cleanupAll = (reason: string): void => {
      clearTimeout(timeoutHandle);
      cleanup(reason);
    };

    // ── shared handlers ────────────────────────────────────────────────────

    const handleRunning = async (devworkspaceId: string, source: string): Promise<void> => {
      if (!isOwner()) {
        return;
      }
      const elapsedMs = Date.now() - startedAt;
      cleanupAll(`Running detected via ${source}`);
      await PostStartInjector.injectCredentials(
        namespace,
        devworkspaceId,
        kubeConfigApi,
        podmanApi,
        key,
        source,
        elapsedMs,
      );
    };

    const handleTerminal = (phase: string, source: string): void => {
      if (!isOwner()) {
        return;
      }
      cleanupAll(`terminal phase ${phase} via ${source}`);
    };

    // ── 1. K8s Watch (fast path) ───────────────────────────────────────────

    const listener: MessageListener = async message => {
      if (message.eventPhase === api.webSocket.EventPhase.ERROR) {
        logger.warn(`PostStartInjector: watch ERROR for ${key} — polling continues`);
        devworkspaceApi.stopWatching();
        return;
      }

      if (!api.webSocket.isDevWorkspaceMessage(message)) {
        return;
      }

      const { devWorkspace } = message;
      if (devWorkspace.metadata?.name !== workspaceName) {
        return;
      }

      const phase = devWorkspace.status?.phase;
      const devworkspaceId = devWorkspace.status?.devworkspaceId;

      if (phase && isTerminalPhase(phase)) {
        handleTerminal(phase, 'watch');
        return;
      }

      if (phase === DevWorkspaceStatus.RUNNING && devworkspaceId) {
        await handleRunning(devworkspaceId, 'watch');
      }
    };

    devworkspaceApi
      .watchInNamespace(listener, { namespace, resourceVersion: '' })
      .catch((error: unknown) => {
        logger.warn(
          error,
          `PostStartInjector: watchInNamespace rejected for ${key} — polling continues`,
        );
      });

    // ── 2. Parallel polling (reliable path) ────────────────────────────────

    pollHandle = setInterval(() => {
      if (!isOwner()) {
        if (pollHandle !== undefined) {
          clearInterval(pollHandle);
          pollHandle = undefined;
        }
        return;
      }

      devworkspaceApi
        .getByName(namespace, workspaceName)
        .then(async dw => {
          const phase = dw.status?.phase;
          const devworkspaceId = dw.status?.devworkspaceId;

          if (phase === DevWorkspaceStatus.RUNNING && devworkspaceId) {
            await handleRunning(devworkspaceId, 'poll');
          } else if (phase && isTerminalPhase(phase)) {
            handleTerminal(phase, 'poll');
          }
        })
        .catch((e: unknown) => {
          logger.warn(e, `PostStartInjector: poll GET failed for ${key}, will retry`);
        });
    }, POLL_INTERVAL_MS);

    // ── 3. Immediate initial check (LIST→STREAM race) ──────────────────────

    devworkspaceApi
      .getByName(namespace, workspaceName)
      .then(async dw => {
        if (!isOwner()) {
          return;
        }
        const phase = dw.status?.phase;
        const devworkspaceId = dw.status?.devworkspaceId;
        if (phase === DevWorkspaceStatus.RUNNING && devworkspaceId) {
          await handleRunning(devworkspaceId, 'initial-check');
        }
      })
      .catch((e: unknown) => {
        logger.warn(e, `PostStartInjector: initial getByName failed for ${key}`);
      });
  }

  private static async injectCredentials(
    namespace: string,
    devworkspaceId: string,
    kubeConfigApi: IKubeConfigApi,
    podmanApi: IPodmanApi,
    key: string,
    source: string,
    elapsedMs: number,
  ): Promise<void> {
    const elapsedSec = Math.round(elapsedMs / 1000);
    logger.info(
      `PostStartInjector: injecting kubeconfig for ${key} ` +
        `(via ${source}, ${elapsedSec}s after start request)`,
    );
    if (elapsedMs > ENTRYPOINT_WINDOW_MS) {
      logger.warn(
        `PostStartInjector: injection for ${key} is ${elapsedSec}s after start request — ` +
          `this exceeds the ~12s UDI entrypoint.sh window. ` +
          `The terminal may have already fallen back to the pod service account identity. ` +
          `Detection source: ${source}`,
      );
    }
    try {
      await kubeConfigApi.injectKubeConfig(namespace, devworkspaceId);
      logger.info(`PostStartInjector: kubeconfig injected successfully for ${key}`);
    } catch (e) {
      logger.error(e, `PostStartInjector: failed to inject kubeconfig for ${key}`);
    }
    try {
      await podmanApi.podmanLogin(namespace, devworkspaceId);
      logger.info(`PostStartInjector: podman login completed for ${key}`);
    } catch (e) {
      logger.error(e, `PostStartInjector: failed podman login for ${key}`);
    }
  }
}
