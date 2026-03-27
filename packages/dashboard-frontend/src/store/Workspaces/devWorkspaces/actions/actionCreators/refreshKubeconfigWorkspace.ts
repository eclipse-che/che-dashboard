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

import { injectKubeConfig, podmanLogin } from '@/services/backend-client/devWorkspaceApi';
import devfileApi from '@/services/devfileApi';
import { DevWorkspaceStatus } from '@/services/helpers/types';
import { AppThunk } from '@/store';

export const refreshKubeconfigWorkspace =
  (workspace: devfileApi.DevWorkspace): AppThunk =>
  async () => {
    if (workspace.status?.phase !== DevWorkspaceStatus.RUNNING) {
      return;
    }
    const devworkspaceId = workspace.status?.devworkspaceId;
    const namespace = workspace.metadata.namespace;
    if (!devworkspaceId || !namespace) {
      throw new Error(
        `Failed to refresh kubeconfig for "${workspace.metadata.name}": missing devworkspaceId or namespace.`,
      );
    }
    await injectKubeConfig(namespace, devworkspaceId);
    await podmanLogin(namespace, devworkspaceId);
  };
