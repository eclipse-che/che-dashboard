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

import common, { ApplicationId } from '@eclipse-che/common';

import devfileApi from '@/services/devfileApi';
import { FactoryParams } from '@/services/helpers/factoryFlow/buildFactoryParams';
import { AppThunk } from '@/store';
import { selectApplications } from '@/store/ClusterInfo';
import { selectDefaultNamespace } from '@/store/InfrastructureNamespaces';
import { verifyAuthorized } from '@/store/SanityCheck';
import {
  selectDefaultEditor,
  selectOpenVSXUrl,
  selectPluginRegistryInternalUrl,
  selectPluginRegistryUrl,
} from '@/store/ServerConfig';
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
    const openVSXUrl = selectOpenVSXUrl(state);
    const pluginRegistryUrl = selectPluginRegistryUrl(state);
    const pluginRegistryInternalUrl = selectPluginRegistryInternalUrl(state);
    const cheEditor = editor ? editor : selectDefaultEditor(state);
    const defaultNamespace = defaultKubernetesNamespace.name;

    try {
      await verifyAuthorized(dispatch, getState);

      dispatch(devWorkspacesRequestAction());

      /* create a new DevWorkspace */
      const createResp = await getDevWorkspaceClient().createDevWorkspace(
        defaultNamespace,
        devWorkspace,
        cheEditor,
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

      await getDevWorkspaceClient().createDevWorkspaceTemplate(
        defaultNamespace,
        createResp.devWorkspace,
        devWorkspaceTemplate,
        pluginRegistryUrl,
        pluginRegistryInternalUrl,
        openVSXUrl,
        clusterConsole,
      );

      /* update the DevWorkspace */

      const updateResp = await getDevWorkspaceClient().updateDevWorkspace(createResp.devWorkspace);

      if (updateResp.headers.warning) {
        dispatch(
          devWorkspaceWarningUpdateAction({
            warning: cleanupMessage(updateResp.headers.warning),
            workspace: updateResp.devWorkspace,
          }),
        );
      }

      dispatch(devWorkspacesAddAction(updateResp.devWorkspace));
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
