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

import { V1alpha2DevWorkspaceStatus } from '@devfile/api';
import { createReducer } from '@reduxjs/toolkit';

import devfileApi from '@/services/devfileApi';
import { getNewerResourceVersion } from '@/services/helpers/resourceVersion';
import { DevWorkspaceStatus } from '@/services/helpers/types';
import { WorkspaceAdapter } from '@/services/workspace-adapter';
import {
  devWorkspacesAddAction,
  devWorkspacesDeleteAction,
  devWorkspacesErrorAction,
  devWorkspacesReceiveAction,
  devWorkspacesRequestAction,
  devWorkspacesTerminateAction,
  devWorkspacesUpdateAction,
  devWorkspacesUpdateStartedAction,
  devWorkspaceWarningUpdateAction,
} from '@/store/Workspaces/devWorkspaces/actions/actions';

export interface State {
  isLoading: boolean;
  workspaces: devfileApi.DevWorkspace[];
  resourceVersion: string;
  error?: string;
  startedWorkspaces: {
    [workspaceUID: string]: string;
  };
  warnings: {
    [workspaceUID: string]: string;
  };
}

export const unloadedState: State = {
  workspaces: [],
  isLoading: false,
  resourceVersion: '0',
  startedWorkspaces: {},
  warnings: {},
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(devWorkspacesRequestAction, state => {
      state.isLoading = true;
      state.error = undefined;
    })
    .addCase(devWorkspacesReceiveAction, (state, action) => {
      state.isLoading = false;
      state.workspaces = action.payload.workspaces;
      state.resourceVersion = getNewerResourceVersion(
        action.payload.resourceVersion,
        state.resourceVersion,
      );
    })
    .addCase(devWorkspacesErrorAction, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    })
    .addCase(devWorkspacesUpdateAction, (state, action) => {
      state.isLoading = false;
      const updatedWorkspace = action.payload;
      if (updatedWorkspace === undefined) {
        return;
      }
      state.workspaces = state.workspaces.map(workspace =>
        WorkspaceAdapter.getUID(workspace) === WorkspaceAdapter.getUID(updatedWorkspace)
          ? updatedWorkspace
          : workspace,
      );
      state.resourceVersion = getNewerResourceVersion(
        updatedWorkspace.metadata.resourceVersion,
        state.resourceVersion,
      );
    })
    .addCase(devWorkspacesAddAction, (state, action) => {
      state.isLoading = false;
      state.workspaces = state.workspaces
        .filter(
          workspace =>
            WorkspaceAdapter.getUID(workspace) !== WorkspaceAdapter.getUID(action.payload),
        )
        .concat([action.payload]);
      state.resourceVersion = getNewerResourceVersion(
        action.payload.metadata.resourceVersion,
        state.resourceVersion,
      );
    })
    .addCase(devWorkspacesTerminateAction, (state, action) => {
      state.isLoading = false;
      state.workspaces = state.workspaces.map(workspace => {
        if (WorkspaceAdapter.getUID(workspace) === action.payload.workspaceUID) {
          const targetWorkspace = Object.assign({}, workspace);
          if (!targetWorkspace.status) {
            targetWorkspace.status = {} as V1alpha2DevWorkspaceStatus;
          }
          targetWorkspace.status.phase = DevWorkspaceStatus.TERMINATING;
          targetWorkspace.status.message = action.payload.message;
          return targetWorkspace;
        }
        return workspace;
      });
    })
    .addCase(devWorkspacesDeleteAction, (state, action) => {
      state.isLoading = false;
      state.workspaces = state.workspaces.filter(
        workspace => WorkspaceAdapter.getUID(workspace) !== WorkspaceAdapter.getUID(action.payload),
      );
      state.resourceVersion = getNewerResourceVersion(
        action.payload.metadata.resourceVersion,
        state.resourceVersion,
      );
    })
    .addCase(devWorkspacesUpdateStartedAction, (state, action) => {
      state.startedWorkspaces = action.payload.reduce((acc, workspace) => {
        if (workspace.spec.started === false) {
          delete acc[WorkspaceAdapter.getUID(workspace)];
          return acc;
        }
        if (acc[WorkspaceAdapter.getUID(workspace)] !== undefined) {
          return acc;
        }
        if (workspace.metadata.resourceVersion === undefined) {
          return acc;
        }
        acc[WorkspaceAdapter.getUID(workspace)] = workspace.metadata.resourceVersion;
        return acc;
      }, state.startedWorkspaces);
    })
    .addCase(devWorkspaceWarningUpdateAction, (state, action) => {
      state.warnings = {
        [WorkspaceAdapter.getUID(action.payload.workspace)]: action.payload.warning,
      };
    })
    .addDefaultCase(state => state),
);
