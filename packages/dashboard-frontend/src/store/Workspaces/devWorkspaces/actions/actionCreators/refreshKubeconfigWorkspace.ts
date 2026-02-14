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

import { injectKubeConfig } from '@/services/backend-client/devWorkspaceApi';
import devfileApi from '@/services/devfileApi';
import { getDefer, IDeferred } from '@/services/helpers/deferred';
import { DevWorkspaceStatus } from '@/services/helpers/types';
import { AppThunk } from '@/store';

export const refreshKubeconfigWorkspace =
  (workspace: devfileApi.DevWorkspace): AppThunk =>
  async () => {
    const defer: IDeferred<void> = getDefer();

    if (workspace.status?.phase === DevWorkspaceStatus.RUNNING) {
      const devworkspaceID = workspace.status?.devworkspaceId;
      const namespace = workspace.metadata.namespace;
      if (!devworkspaceID || !namespace) {
        defer.reject(
          new Error(
            `Failed to refresh the kubeconfig for the workspace ${workspace.metadata.name} because of missing devworkspaceId or namespace.`,
          ),
        );
        return defer.promise;
      }
      try {
        await injectKubeConfig(namespace, devworkspaceID);
      } catch (e) {
        defer.reject(
          new Error(
            `Failed to refresh the kubeconfig for the workspace ${workspace.metadata.name}. ${e}`,
          ),
        );
      }
    }

    return defer.promise;
  };
