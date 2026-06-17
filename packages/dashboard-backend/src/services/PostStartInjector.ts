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

import { V1alpha2DevWorkspace } from '@devfile/api';
import {
  devworkspaceGroup,
  devworkspaceLatestVersion,
  devworkspacePlural,
} from '@devfile/api/constants/constants';
import * as k8s from '@kubernetes/client-node';
import { V1Status } from '@kubernetes/client-node';

import { DevWorkspaceClient } from '@/devworkspaceClient';
import { IKubeConfigApi, IPodmanApi } from '@/devworkspaceClient/types';
import { KubeConfigProvider } from '@/services/kubeclient/kubeConfigProvider';
import { logger } from '@/utils/logger';

const INJECTION_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 10_000;
const POLL_TIMEOUT_MS = 300_000;
const POLL_STOP_PHASES = new Set([
  'Running',
  'Failed',
  'Failing',
  'Stopped',
  'Stopping',
  'Terminating',
]);

/**
 * Watches a specific DevWorkspace after it is started and injects
 * kubeconfig + podman credentials once it reaches the Running phase.
 *
 * Guards:
 * - Only one watch per workspace (keyed by namespace/name).
 * - Auto-unsubscribes on: success, Failed phase, timeout, or watch error.
 */
export class PostStartInjector {
  private static activeWatches = new Map<string, AbortController>();

  static watchAndInject(
    namespace: string,
    workspaceName: string,
    kubeConfigApi: IKubeConfigApi,
    podmanApi: IPodmanApi,
  ): void {
    const key = `${namespace}/${workspaceName}`;

    if (PostStartInjector.activeWatches.has(key)) {
      logger.info(`PostStartInjector: watch already active for ${key}, skipping`);
      return;
    }

    // Use the dashboard SA kubeconfig for the watch so that RBAC restrictions on
    // the user's OAuth token cannot prevent the watch from succeeding.
    const saKc = new KubeConfigProvider().getSAKubeConfig();
    const watch = new k8s.Watch(saKc);
    const path = `/apis/${devworkspaceGroup}/${devworkspaceLatestVersion}/watch/namespaces/${namespace}/${devworkspacePlural}`;
    const queryParams = {
      watch: true,
      fieldSelector: `metadata.name=${workspaceName}`,
    };

    const cleanup = (abortController?: AbortController) => {
      PostStartInjector.activeWatches.delete(key);
      abortController?.abort();
    };

    const timeoutHandle = setTimeout(() => {
      logger.warn(`PostStartInjector: timed out waiting for ${key} to reach Running`);
      const ac = PostStartInjector.activeWatches.get(key);
      cleanup(ac);
    }, INJECTION_TIMEOUT_MS);

    const cleanupWithTimeout = (abortController?: AbortController) => {
      clearTimeout(timeoutHandle);
      cleanup(abortController);
    };

    watch
      .watch(
        path,
        queryParams,
        async (eventPhase: string, apiObj: V1alpha2DevWorkspace | V1Status) => {
          if (eventPhase === 'ERROR') {
            logger.warn(`PostStartInjector: watch ERROR for ${key}`);
            const ac = PostStartInjector.activeWatches.get(key);
            cleanupWithTimeout(ac);
            return;
          }

          const dw = apiObj as V1alpha2DevWorkspace;
          const phase = dw.status?.phase;
          const devworkspaceId = dw.status?.devworkspaceId;

          if (phase === 'Failed') {
            logger.info(`PostStartInjector: ${key} entered Failed phase, aborting`);
            const ac = PostStartInjector.activeWatches.get(key);
            cleanupWithTimeout(ac);
            return;
          }

          if (phase === 'Running' && devworkspaceId) {
            logger.info(
              `PostStartInjector: ${key} is Running, injecting kubeconfig and podman login`,
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
            const ac = PostStartInjector.activeWatches.get(key);
            cleanupWithTimeout(ac);
          }
        },
        (error: unknown) => {
          logger.warn(error, `PostStartInjector: watch connection lost for ${key}`);
          cleanupWithTimeout();
        },
      )
      .then((abortController: AbortController) => {
        if (!PostStartInjector.activeWatches.has(key)) {
          abortController.abort();
        } else {
          PostStartInjector.activeWatches.set(key, abortController);
        }
      })
      .catch((error: unknown) => {
        logger.warn(error, `PostStartInjector: watch failed for ${key}, starting polling fallback`);
        cleanupWithTimeout();
        PostStartInjector.startPollingFallback(namespace, workspaceName, kubeConfigApi, podmanApi);
      });

    PostStartInjector.activeWatches.set(key, new AbortController());
  }

  private static startPollingFallback(
    namespace: string,
    workspaceName: string,
    kubeConfigApi: IKubeConfigApi,
    podmanApi: IPodmanApi,
  ): void {
    const key = `${namespace}/${workspaceName}`;

    logger.info(`PostStartInjector: polling fallback started for ${key}`);

    const saKc = new KubeConfigProvider().getSAKubeConfig();
    const dwClient = new DevWorkspaceClient(saKc);

    // Re-register so duplicate watchAndInject calls are still blocked during polling.
    const abortController = new AbortController();
    PostStartInjector.activeWatches.set(key, abortController);

    let elapsed = 0;

    const intervalHandle = setInterval(() => {
      if (abortController.signal.aborted) {
        clearInterval(intervalHandle);
        return;
      }

      elapsed += POLL_INTERVAL_MS;
      if (elapsed >= POLL_TIMEOUT_MS) {
        logger.warn(`PostStartInjector: polling timed out for ${key}`);
        clearInterval(intervalHandle);
        PostStartInjector.activeWatches.delete(key);
        return;
      }

      dwClient.devworkspaceApi
        .getByName(namespace, workspaceName)
        .then(async dw => {
          const phase = dw.status?.phase;
          const devworkspaceId = dw.status?.devworkspaceId;

          if (!phase || !POLL_STOP_PHASES.has(phase)) {
            return;
          }

          clearInterval(intervalHandle);
          PostStartInjector.activeWatches.delete(key);

          if (phase === 'Running' && devworkspaceId) {
            logger.info(`PostStartInjector: ${key} is Running (poll), injecting`);
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
          } else {
            logger.info(`PostStartInjector: ${key} is in phase ${phase}, stopping poll`);
          }
        })
        .catch((e: unknown) => {
          logger.warn(e, `PostStartInjector: poll GET failed for ${key}, will retry`);
        });
    }, POLL_INTERVAL_MS);
  }
}
