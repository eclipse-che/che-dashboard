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

const INJECTION_TIMEOUT_MS = 300000;
const POLL_INTERVAL_MS = 10000;
const POLL_TIMEOUT_MS = 300000;

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
 * Uses the same watchInNamespace() path as the WebSocket SUBSCRIBE DEV_WORKSPACE
 * channel so there is no separate watch infrastructure.
 *
 * Guards:
 * - Only one watch per workspace (keyed by namespace/name).
 * - Unsubscribes (stopWatching) on: success, terminal phase, timeout, or watch error.
 * - Falls back to polling (GET every 10 s, up to 300 s) if the watch fails.
 */
export class PostStartInjector {
  // Stores a cleanup function per active workspace key.
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
      logger.info(`PostStartInjector: watch already active for ${key}, skipping`);
      return;
    }

    const cleanup = () => {
      devworkspaceApi.stopWatching();
      PostStartInjector.activeWatches.delete(key);
    };

    PostStartInjector.activeWatches.set(key, cleanup);

    const timeoutHandle = setTimeout(() => {
      logger.warn(`PostStartInjector: watch timed out for ${key}, starting polling fallback`);
      cleanup();
      PostStartInjector.startPollingFallback(
        namespace,
        workspaceName,
        devworkspaceApi,
        kubeConfigApi,
        podmanApi,
      );
    }, INJECTION_TIMEOUT_MS);

    const cleanupWithTimeout = () => {
      clearTimeout(timeoutHandle);
      cleanup();
    };

    const listener: MessageListener = async message => {
      if (message.eventPhase === api.webSocket.EventPhase.ERROR) {
        logger.warn(`PostStartInjector: watch ERROR for ${key}, starting polling fallback`);
        cleanupWithTimeout();
        PostStartInjector.startPollingFallback(
          namespace,
          workspaceName,
          devworkspaceApi,
          kubeConfigApi,
          podmanApi,
        );
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
        logger.info(`PostStartInjector: ${key} entered ${phase} phase, aborting`);
        cleanupWithTimeout();
        return;
      }

      if (phase === DevWorkspaceStatus.RUNNING && devworkspaceId) {
        cleanupWithTimeout();
        await PostStartInjector.injectCredentials(
          namespace,
          devworkspaceId,
          kubeConfigApi,
          podmanApi,
          key,
        );
      }
    };

    devworkspaceApi
      .watchInNamespace(listener, { namespace, resourceVersion: '' })
      .catch((error: unknown) => {
        logger.warn(
          error,
          `PostStartInjector: watchInNamespace rejected for ${key}, starting polling fallback`,
        );
        cleanupWithTimeout();
        PostStartInjector.startPollingFallback(
          namespace,
          workspaceName,
          devworkspaceApi,
          kubeConfigApi,
          podmanApi,
        );
      });
  }

  private static startPollingFallback(
    namespace: string,
    workspaceName: string,
    devworkspaceApi: IDevWorkspaceApi,
    kubeConfigApi: IKubeConfigApi,
    podmanApi: IPodmanApi,
  ): void {
    const key = `${namespace}/${workspaceName}`;

    logger.info(`PostStartInjector: polling fallback started for ${key}`);

    let cancelled = false;
    const cleanup = () => {
      cancelled = true;
      PostStartInjector.activeWatches.delete(key);
    };

    // Re-register so duplicate watchAndInject calls are still blocked during polling.
    // Note: the same devworkspaceApi instance is reused here. stopWatching() was already
    // called before startPollingFallback(), but getByName() is a standalone REST call
    // with no dependency on watch state, so the instance is safe to reuse.
    PostStartInjector.activeWatches.set(key, cleanup);

    let elapsed = 0;

    const intervalHandle = setInterval(() => {
      if (cancelled) {
        clearInterval(intervalHandle);
        return;
      }

      elapsed += POLL_INTERVAL_MS;
      if (elapsed >= POLL_TIMEOUT_MS) {
        logger.warn(`PostStartInjector: polling timed out for ${key}`);
        clearInterval(intervalHandle);
        cleanup();
        return;
      }

      devworkspaceApi
        .getByName(namespace, workspaceName)
        .then(async dw => {
          const phase = dw.status?.phase;
          const devworkspaceId = dw.status?.devworkspaceId;

          if (!phase || (phase !== DevWorkspaceStatus.RUNNING && !isTerminalPhase(phase))) {
            return;
          }

          clearInterval(intervalHandle);
          cleanup();

          if (phase === DevWorkspaceStatus.RUNNING && devworkspaceId) {
            await PostStartInjector.injectCredentials(
              namespace,
              devworkspaceId,
              kubeConfigApi,
              podmanApi,
              key,
              elapsed,
            );
          } else {
            logger.info(`PostStartInjector: ${key} is in phase ${phase}, stopping poll`);
          }
        })
        .catch((e: unknown) => {
          logger.warn(e, `PostStartInjector: poll GET failed for ${key}, will retry`);
        });
    }, POLL_INTERVAL_MS);
  }

  private static async injectCredentials(
    namespace: string,
    devworkspaceId: string,
    kubeConfigApi: IKubeConfigApi,
    podmanApi: IPodmanApi,
    key: string,
    elapsedMs?: number,
  ): Promise<void> {
    const elapsed =
      elapsedMs !== undefined ? ` (workspace ready after ${Math.round(elapsedMs / 1000)}s)` : '';
    logger.info(
      `PostStartInjector: ${key} is Running, injecting kubeconfig and podman login${elapsed}`,
    );
    try {
      await kubeConfigApi.injectKubeConfig(namespace, devworkspaceId);
    } catch (e) {
      logger.error(e, `PostStartInjector: failed to inject kubeconfig for ${key}`);
    }
    try {
      await podmanApi.podmanLogin(namespace, devworkspaceId);
    } catch (e) {
      logger.error(e, `PostStartInjector: failed podman login for ${key}`);
    }
  }
}
