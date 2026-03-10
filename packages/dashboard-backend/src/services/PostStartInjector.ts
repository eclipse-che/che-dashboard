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

import { IKubeConfigApi, IPodmanApi } from '@/devworkspaceClient/types';
import { logger } from '@/utils/logger';

const INJECTION_TIMEOUT_MS = 60_000;

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
    kc: k8s.KubeConfig,
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

    const watch = new k8s.Watch(kc);
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
        logger.error(error, `PostStartInjector: failed to start watch for ${key}`);
        cleanupWithTimeout();
      });

    PostStartInjector.activeWatches.set(key, new AbortController());
  }
}
