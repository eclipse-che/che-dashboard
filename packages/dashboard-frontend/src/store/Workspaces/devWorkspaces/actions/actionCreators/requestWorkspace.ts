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
import { DEVWORKSPACE_UPDATING_TIMESTAMP_ANNOTATION } from '@/services/devfileApi/devWorkspace/metadata';
import { AppThunk } from '@/store';
import { verifyAuthorized } from '@/store/SanityCheck';
import { actionCreators } from '@/store/Workspaces/devWorkspaces/actions';
import { getDevWorkspaceClient } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers';
import {
  devWorkspacesErrorAction,
  devWorkspacesRequestAction,
  devWorkspacesUpdateAction,
} from '@/store/Workspaces/devWorkspaces/actions/actions';

export const requestWorkspace =
  (workspace: devfileApi.DevWorkspace): AppThunk =>
  async (dispatch, getState) => {
    try {
      await verifyAuthorized(dispatch, getState);

      dispatch(devWorkspacesRequestAction());

      const namespace = workspace.metadata.namespace;
      const name = workspace.metadata.name;
      const received = await getDevWorkspaceClient().getWorkspaceByName(namespace, name);
      dispatch(devWorkspacesUpdateAction(received));

      if (
        received.metadata.annotations?.[DEVWORKSPACE_UPDATING_TIMESTAMP_ANNOTATION] === undefined
      ) {
        // this will set updating timestamp to annotations and update the workspace
        await dispatch(actionCreators.updateWorkspace(received));
      }
    } catch (e) {
      const errorMessage =
        `Failed to fetch the workspace ${workspace.metadata.name}, reason: ` +
        common.helpers.errors.getMessage(e);
      dispatch(devWorkspacesErrorAction(errorMessage));
      throw e;
    }
  };
