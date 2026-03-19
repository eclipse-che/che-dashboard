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

import common, { ApplicationId } from '@eclipse-che/common';

import devfileApi from '@/services/devfileApi';
import { FactoryParams } from '@/services/helpers/factoryFlow/buildFactoryParams';
import { AppThunk } from '@/store';
import { selectApplications } from '@/store/ClusterInfo';
import { selectDefaultNamespace } from '@/store/InfrastructureNamespaces';
import { verifyAuthorized } from '@/store/SanityCheck';
import { getDefaultEditor } from '@/store/ServerConfig/helpers';
import { selectServerConfigState } from '@/store/ServerConfig/selectors';
import { getDevWorkspaceClient } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers';
import { updateDevWorkspaceTemplate } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers/editorImage';
import {
  devWorkspacesAddAction,
  devWorkspacesErrorAction,
  devWorkspacesRequestAction,
  devWorkspaceWarningUpdateAction,
} from '@/store/Workspaces/devWorkspaces/actions/actions';

export const createWorkspaceFromResources =
  (
    devWorkspace: devfileApi.DevWorkspace,
    devWorkspaceTemplate: devfileApi.DevWorkspaceTemplate,
    params: Partial<FactoryParams>,
    editor?: string,
  ): AppThunk =>
  async (dispatch, getState) => {
    const state = getState();
    const defaultKubernetesNamespace = selectDefaultNamespace(state);
    const serverConfig = selectServerConfigState(state).config;
    const cheEditor = editor || getDefaultEditor(serverConfig);
    const defaultNamespace = defaultKubernetesNamespace.name;
    const customName = params.name;

    try {
      await verifyAuthorized(dispatch, getState);

      dispatch(devWorkspacesRequestAction());

      /* create a new DevWorkspace */
      const createResp = await getDevWorkspaceClient().createDevWorkspace(
        defaultNamespace,
        devWorkspace,
        cheEditor,
        customName,
      );

      if (createResp.headers.warning) {
        dispatch(
          devWorkspaceWarningUpdateAction({
            warning: cleanupMessage(createResp.headers.warning),
            workspace: createResp.devWorkspace,
          }),
        );
      }

      const clusterConsole = selectApplications(state).find(
        app => app.id === ApplicationId.CLUSTER_CONSOLE,
      );

      devWorkspaceTemplate = updateDevWorkspaceTemplate(devWorkspaceTemplate, params.editorImage);

      /* create a new DevWorkspaceTemplate */
      const pluginRegistryUrl = serverConfig?.pluginRegistryURL;
      const pluginRegistryInternalUrl = serverConfig?.pluginRegistryInternalURL;
      const openVSXUrl = serverConfig?.pluginRegistry?.openVSXURL;

      await getDevWorkspaceClient().createDevWorkspaceTemplate(
        defaultNamespace,
        createResp.devWorkspace,
        devWorkspaceTemplate,
        pluginRegistryUrl,
        pluginRegistryInternalUrl,
        openVSXUrl,
        clusterConsole,
      );

      // Set the SCC attribute once at creation time so the DevWorkspace operator
      // can grant the workspace SA the required SCC (e.g. container-build).
      // On subsequent starts only HOST_USERS is synced (see startWorkspace.ts).
      const createdWorkspace = await getDevWorkspaceClient().manageContainerSccAttribute(
        createResp.devWorkspace,
        serverConfig,
      );

      dispatch(devWorkspacesAddAction(createdWorkspace));
    } catch (e) {
      const errorMessage =
        'Failed to create a new workspace, reason: ' + common.helpers.errors.getMessage(e);
      dispatch(devWorkspacesErrorAction(errorMessage));
      throw e;
    }
  };

/**
 * Get rid of the status code from the message.
 */
function cleanupMessage(message: string) {
  return message.replace(/^\d+\s+?-\s+?/g, '');
}
