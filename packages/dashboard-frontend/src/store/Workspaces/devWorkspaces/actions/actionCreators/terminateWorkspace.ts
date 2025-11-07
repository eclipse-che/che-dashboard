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
import { WorkspaceAdapter } from '@/services/workspace-adapter';
import { AppThunk } from '@/store';
import { verifyAuthorized } from '@/store/SanityCheck';
import { getDevWorkspaceClient } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers';
import {
  devWorkspacesErrorAction,
  devWorkspacesRequestAction,
  devWorkspacesTerminateAction,
} from '@/store/Workspaces/devWorkspaces/actions/actions';

export const terminateWorkspace =
  (workspace: devfileApi.DevWorkspace): AppThunk =>
  async (dispatch, getState) => {
    try {
      await verifyAuthorized(dispatch, getState);

      dispatch(devWorkspacesRequestAction());

      const namespace = workspace.metadata.namespace;
      const name = workspace.metadata.name;
      await getDevWorkspaceClient().delete(namespace, name);
      const workspaceUID = WorkspaceAdapter.getUID(workspace);
      dispatch(
        devWorkspacesTerminateAction({
          workspaceUID,
          message: workspace.status?.message || 'Cleaning up resources for deletion',
        }),
      );
    } catch (e) {
      const errorMessage =
        `Failed to delete the workspace ${workspace.metadata.name}, reason: ` +
        common.helpers.errors.getMessage(e);
      dispatch(devWorkspacesErrorAction(errorMessage));
      throw e;
    }
  };
