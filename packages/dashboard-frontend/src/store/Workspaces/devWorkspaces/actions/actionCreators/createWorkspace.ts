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

import {
  createWorkspaceViaEndpoint,
  WorkspaceCreationParams,
} from '@/services/backend-client/workspaceCreationApi';
import { AppThunk } from '@/store';
import {
  devWorkspacesAddAction,
  devWorkspacesErrorAction,
  devWorkspacesRequestAction,
} from '@/store/Workspaces/devWorkspaces/actions/actions';

export const createWorkspace =
  (namespace: string, params: WorkspaceCreationParams): AppThunk =>
  async dispatch => {
    dispatch(devWorkspacesRequestAction());
    try {
      const workspace = await createWorkspaceViaEndpoint(namespace, params);
      dispatch(devWorkspacesAddAction(workspace));
    } catch (e) {
      const errorMessage = common.helpers.errors.getMessage(e);
      dispatch(devWorkspacesErrorAction(errorMessage));
      throw e;
    }
  };
