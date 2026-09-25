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
// The frontend shows a start-timeout error after 300 s (startTimeout in
// ServerConfig/reducer.ts), so 600 s gives 2× that window before cleanup.
const OVERALL_TIMEOUT_MS = 600000;
const POLL_INTERVAL_MS = 2000;
// If the watch stream has not reported a decisive phase (Running or terminal)
// within this window, activate polling as an additional safety net.
const WATCH_GRACE_MS = 10000;

function isFailurePhase(phase: string): boolean {
  return phase === DevWorkspaceStatus.FAILED || phase === DevWorkspaceStatus.FAILING;
}

function isShutdownPhase(phase: string): boolean {
  return (
    phase === DevWorkspaceStatus.STOPPED ||
    phase === DevWorkspaceStatus.STOPPING ||
    phase === DevWorkspaceStatus.TERMINATING
  );
}

/**
 * Watches a specific DevWorkspace after it is started and injects
 * kubeconfig + podman credentials once it reaches the Running phase.
 *
 * Detection strategy:
 *   1. K8s Watch — primary path, near-instant when healthy.
 *   2. Polling fallback (GET every 2 s) — starts when the watch
 *      fails explicitly (ERROR event) or when the watch grace
 *      period expires without a decisive phase.
 *   3. Immediate initial GET — catches workspaces that reached
 *      Running before the watch stream opened (LIST→STREAM race).
 *
 * Stale-phase guard:
 *   watchAndInject runs right after PATCH started=true, before the
 *   controller reconciles. The first watch event or initial GET may
 *   still carry the pre-reconcile phase (Stopped/Stopping/Terminating).
 *   Shutdown phases are only treated as decisive after a non-shutdown
 *   phase (Starting) has been observed, indicating reconciliation began.
 *   Failure phases (Failed/Failing) are always decisive.
 *
 * Guards:
 * - Only one session per workspace (keyed by namespace/name).
 * - The key stays in the registry during credential injection to
 *   prevent a duplicate PATCH from starting a second session.
 * - Cleanup uses function identity (`isOwner`) to prevent a stale
 *   in-flight callback from tearing down a newer invocation.
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
        `watch (poll fallback every ${POLL_INTERVAL_MS / 1000}s on failure), ` +
        `${OVERALL_TIMEOUT_MS / 1000}s overall timeout`,
    );

    const startedAt = Date.now();
    let pollHandle: ReturnType<typeof setInterval> | undefined;
    let watchGraceHandle: ReturnType<typeof setTimeout> | undefined;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    let seenNonTerminal = false;
    let injecting = false;

    const isOwner = (): boolean => PostStartInjector.activeWatches.get(key) === cleanup;

    const cleanup = (reason = 'external', deleteKey = true): void => {
      if (!isOwner()) {
        return;
      }
      const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
      logger.info(
        `PostStartInjector: unsubscribing for ${key} — ${reason} (${elapsedSec}s elapsed)`,
      );
      devworkspaceApi.stopWatching();
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
        timeoutHandle = undefined;
      }
      if (watchGraceHandle !== undefined) {
        clearTimeout(watchGraceHandle);
        watchGraceHandle = undefined;
      }
      if (pollHandle !== undefined) {
        clearInterval(pollHandle);
        pollHandle = undefined;
      }
      if (deleteKey) {
        PostStartInjector.activeWatches.delete(key);
      }
    };

    PostStartInjector.activeWatches.set(key, cleanup);

    timeoutHandle = setTimeout(() => {
      logger.warn(
        `PostStartInjector: overall ${OVERALL_TIMEOUT_MS / 1000}s timeout for ${key} — ` +
          `workspace may have started without kubeconfig injection. ` +
          `Check if the K8s Watch stream and polling GET were both blocked.`,
      );
      cleanup('timeout');
    }, OVERALL_TIMEOUT_MS);

    // ── shared handlers ────────────────────────────────────────────────────

    const isDecisiveTerminal = (phase: string): boolean => {
      if (isFailurePhase(phase)) {
        return true;
      }
      return isShutdownPhase(phase) && seenNonTerminal;
    };

    const handleRunning = async (devworkspaceId: string, source: string): Promise<void> => {
      if (!isOwner() || injecting) {
        return;
      }
      injecting = true;
      const elapsedMs = Date.now() - startedAt;
      cleanup(`Running detected via ${source}`, false);
      await PostStartInjector.injectCredentials(
        namespace,
        devworkspaceId,
        kubeConfigApi,
        podmanApi,
        key,
        source,
        elapsedMs,
      );
      PostStartInjector.activeWatches.delete(key);
    };

    const handleTerminal = (phase: string, source: string): void => {
      if (!isOwner() || injecting) {
        return;
      }
      cleanup(`terminal phase ${phase} via ${source}`);
    };

    // ── polling fallback ─────────────────────────────────────────────────

    const startPolling = (reason: string): void => {
      if (pollHandle !== undefined || !isOwner()) {
        return;
      }
      logger.info(
        `PostStartInjector: ${reason} for ${key}, falling back to polling every ${POLL_INTERVAL_MS / 1000}s`,
      );
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

            if (phase === DevWorkspaceStatus.STARTING) {
              seenNonTerminal = true;
            }

            if (phase === DevWorkspaceStatus.RUNNING && devworkspaceId) {
              await handleRunning(devworkspaceId, 'poll');
            } else if (phase && isDecisiveTerminal(phase)) {
              handleTerminal(phase, 'poll');
            }
          })
          .catch((e: unknown) => {
            logger.warn(e, `PostStartInjector: poll GET failed for ${key}, will retry`);
          });
      }, POLL_INTERVAL_MS);
    };

    watchGraceHandle = setTimeout(() => {
      watchGraceHandle = undefined;
      startPolling('no decisive phase within grace period');
    }, WATCH_GRACE_MS);

    // ── 1. K8s Watch (fast path) ───────────────────────────────────────────

    const listener: MessageListener = async message => {
      if (message.eventPhase === api.webSocket.EventPhase.ERROR) {
        logger.warn(`PostStartInjector: watch ERROR for ${key} — falling back to polling`);
        devworkspaceApi.stopWatching();
        startPolling('watch error');
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

      if (phase === DevWorkspaceStatus.STARTING) {
        seenNonTerminal = true;
      }

      if (phase && isDecisiveTerminal(phase)) {
        handleTerminal(phase, 'watch');
        return;
      }

      if (phase === DevWorkspaceStatus.RUNNING && devworkspaceId) {
        await handleRunning(devworkspaceId, 'watch');
      }
    };

    devworkspaceApi.watchInNamespace(listener, { namespace, resourceVersion: '' });

    // ── 2. Immediate initial check (LIST→STREAM race) ───────────────────────

    devworkspaceApi
      .getByName(namespace, workspaceName)
      .then(async dw => {
        if (!isOwner()) {
          return;
        }
        const phase = dw.status?.phase;
        const devworkspaceId = dw.status?.devworkspaceId;

        if (phase === DevWorkspaceStatus.STARTING) {
          seenNonTerminal = true;
        }

        if (phase === DevWorkspaceStatus.RUNNING && devworkspaceId) {
          await handleRunning(devworkspaceId, 'initial-check');
        } else if (phase && isFailurePhase(phase)) {
          handleTerminal(phase, 'initial-check');
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
