/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { devworkspaceGroup, devworkspaceLatestVersion, devworkspacePlural } from '@devfile/api/api';
import { api } from '@eclipse-che/common';
import * as k8s from '@kubernetes/client-node';

import { createError } from '@/devworkspaceClient/services/helpers/createError';
import {
  CustomObjectAPI,
  prepareCustomObjectAPI,
} from '@/devworkspaceClient/services/helpers/prepareCustomObjectAPI';
import { ServerConfigApiService } from '@/devworkspaceClient/services/serverConfigApi';
import { IDevWorkspaceClusterApi } from '@/devworkspaceClient/types';

const DEV_WORKSPACE_API_ERROR_LABEL = 'CUSTOM_OBJECTS_API_ERROR';

export class DevWorkspaceClusterApi implements IDevWorkspaceClusterApi {
  private readonly customObjectAPI: CustomObjectAPI;
  private readonly serverConfigApiService: ServerConfigApiService;

  constructor(kc: k8s.KubeConfig) {
    this.customObjectAPI = prepareCustomObjectAPI(kc);
    this.serverConfigApiService = new ServerConfigApiService(kc);
  }

  async isRunningWorkspacesClusterLimitExceeded(): Promise<boolean> {
    try {
      const resp = await this.customObjectAPI.listClusterCustomObject(
        devworkspaceGroup,
        devworkspaceLatestVersion,
        devworkspacePlural,
      );
      const devWorkspaces = resp.body as api.IDevWorkspaceList;

      const numberOfRunningWorkspacesOnCluster = devWorkspaces.items.filter(
        workspace =>
          workspace.status?.phase === 'Running' || workspace.status?.phase === 'Starting',
      ).length;

      return numberOfRunningWorkspacesOnCluster >= (await this.getRunningWorkspacesClusterLimit());
    } catch (e) {
      throw createError(e, DEV_WORKSPACE_API_ERROR_LABEL, 'Unable to list devworkspaces');
    }
  }

  private async getRunningWorkspacesClusterLimit(): Promise<number> {
    const cheCustomResource = await this.serverConfigApiService.fetchCheCustomResource();
    return this.serverConfigApiService.getRunningWorkspacesClusterLimit(cheCustomResource);
  }
}
