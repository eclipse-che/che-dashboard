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

import common from '@eclipse-che/common';

import devfileApi from '@/services/devfileApi';
import { AppThunk } from '@/store';
import { verifyAuthorized } from '@/store/SanityCheck';
import { getDevWorkspaceClient } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers';
import { devWorkspacesErrorAction } from '@/store/Workspaces/devWorkspaces/actions/actions';

export const stopWorkspace =
  (workspace: devfileApi.DevWorkspace): AppThunk =>
  async (dispatch, getState): Promise<void> => {
    try {
      await verifyAuthorized(dispatch, getState);

      await getDevWorkspaceClient().changeWorkspaceStatus(workspace, false);
    } catch (e) {
      const errorMessage =
        `Failed to stop the workspace ${workspace.metadata.name}, reason: ` +
        common.helpers.errors.getMessage(e);
      dispatch(devWorkspacesErrorAction(errorMessage));
      throw e;
    }
  };
