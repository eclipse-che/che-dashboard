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
import { AppThunk } from '@/store';
import { verifyAuthorized } from '@/store/SanityCheck';
import { getDevWorkspaceClient } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers';
import {
  devWorkspacesErrorAction,
  devWorkspacesRequestAction,
  devWorkspacesUpdateAction,
} from '@/store/Workspaces/devWorkspaces/actions/actions';

export const updateWorkspaceAnnotation =
  (workspace: devfileApi.DevWorkspace): AppThunk =>
  async (dispatch, getState) => {
    try {
      await verifyAuthorized(dispatch, getState);

      dispatch(devWorkspacesRequestAction());

      const updated = await getDevWorkspaceClient().updateAnnotation(workspace);
      dispatch(devWorkspacesUpdateAction(updated));
    } catch (e) {
      const errorMessage =
        `Failed to update the workspace ${workspace.metadata.name}, reason: ` +
        common.helpers.errors.getMessage(e);
      dispatch(devWorkspacesErrorAction(errorMessage));
      throw e;
    }
  };
