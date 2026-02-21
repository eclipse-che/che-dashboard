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

import common from '@eclipse-che/common';

import devfileApi from '@/services/devfileApi';
import { DEVWORKSPACE_CHE_EDITOR } from '@/services/devfileApi/devWorkspace/metadata';
import { isOAuthResponse, OAuthService } from '@/services/oauth';
import { AppThunk } from '@/store';
import {
  checkRunningDevWorkspacesClusterLimitExceeded,
  devWorkspacesClusterActionCreators,
} from '@/store/DevWorkspacesCluster';
import { verifyAuthorized } from '@/store/SanityCheck';
import { FACTORY_RESOLVER_NOT_FOUND_ERROR_MESSAGE } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/const';
import {
  checkDevWorkspaceNextStartAnnotation,
  checkRunningWorkspacesLimit,
  getDevWorkspaceClient,
  getWarningFromResponse,
} from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers';
import {
  getEditorName,
  getLifeTimeMs,
  updateEditor,
} from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers/updateEditor';
import {
  devWorkspacesErrorAction,
  devWorkspacesRequestAction,
  devWorkspacesUpdateAction,
  devWorkspaceWarningUpdateAction,
} from '@/store/Workspaces/devWorkspaces/actions/actions';

export const startWorkspace =
  (_workspace: devfileApi.DevWorkspace, debugWorkspace = false): AppThunk =>
  async (dispatch, getState) => {
    let workspace = getState().devWorkspaces.workspaces.find(
      w => w.metadata.uid === _workspace.metadata.uid,
    );
    if (workspace === undefined) {
      console.warn(`Can't find the target workspace ${_workspace.metadata.name}`);
      return;
    }
    if (workspace.spec.started) {
      console.warn(`Workspace ${_workspace.metadata.name} already started`);
      return;
    }

    try {
      await verifyAuthorized(dispatch, getState);

      try {
        await OAuthService.refreshTokenIfProjectExists(workspace);
      } catch (e: unknown) {
        // Do not interrupt the workspace start, but show a warning notification.
        const warnMessage = getWarningFromResponse(e);
        // Do not dispatch a warning, if the git provider is not supported.
        if (warnMessage && warnMessage !== FACTORY_RESOLVER_NOT_FOUND_ERROR_MESSAGE) {
          dispatch(devWorkspaceWarningUpdateAction({ workspace, warning: warnMessage }));
        }
      }

      await dispatch(
        devWorkspacesClusterActionCreators.requestRunningDevWorkspacesClusterLimitExceeded(),
      );

      dispatch(devWorkspacesRequestAction());

      checkRunningDevWorkspacesClusterLimitExceeded(getState());
      checkRunningWorkspacesLimit(getState());

      await checkDevWorkspaceNextStartAnnotation(getDevWorkspaceClient(), workspace);

      const config = getState().dwServerConfig.config;
      workspace = await getDevWorkspaceClient().managePvcStrategy(workspace, config);

      workspace = await getDevWorkspaceClient().manageHostUsersEnvVar(workspace, config);

      workspace = await getDevWorkspaceClient().manageDebugMode(workspace, debugWorkspace);

      const editorName = getEditorName(workspace);
      const lifeTimeMs = getLifeTimeMs(workspace);
      if (editorName && lifeTimeMs > 30000) {
        await updateEditor(editorName, getState);
      }

      const startingWorkspace = await getDevWorkspaceClient().changeWorkspaceStatus(
        workspace,
        true,
        true,
      );

      const editor = startingWorkspace.metadata.annotations
        ? startingWorkspace.metadata.annotations[DEVWORKSPACE_CHE_EDITOR]
        : undefined;
      const defaultPlugins = getState().dwPlugins.defaultPlugins;
      await getDevWorkspaceClient().onStart(startingWorkspace, defaultPlugins, editor);
      dispatch(devWorkspacesUpdateAction(startingWorkspace));
    } catch (e) {
      // Skip authorization errors. The page is redirecting to an SCM authentication page.
      if (common.helpers.errors.includesAxiosResponse(e) && isOAuthResponse(e.response.data)) {
        return;
      }
      const errorMessage =
        `Failed to start the workspace ${workspace.metadata.name}, reason: ` +
        common.helpers.errors.getMessage(e);
      dispatch(devWorkspacesErrorAction(errorMessage));

      throw e;
    }
  };
