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

import { createAction } from '@reduxjs/toolkit';

import devfileApi from '@/services/devfileApi';
import { FactoryParams } from '@/services/helpers/factoryFlow/buildFactoryParams';
import { Workspace } from '@/services/workspace-adapter';
import { AppThunk } from '@/store';
import { devWorkspacesActionCreators } from '@/store/Workspaces/devWorkspaces';

type WorkspaceQualifiedNamePayload = {
  namespace: string;
  workspaceName: string;
};
export const qualifiedNameSetAction =
  createAction<WorkspaceQualifiedNamePayload>('qualifiedName/set');
export const qualifiedNameClearAction = createAction('qualifiedName/clear');

export const workspaceUIDSetAction = createAction<string>('workspaceUID/set');
export const workspaceUIDClearAction = createAction('workspaceUID/clear');

export type ResourceQueryParams = {
  'debug-workspace-start': boolean;
  [propName: string]: string | boolean | undefined;
};

export const actionCreators = {
  requestWorkspaces: (): AppThunk => async dispatch => {
    await dispatch(devWorkspacesActionCreators.requestWorkspaces());
  },

  requestWorkspace:
    (workspace: Workspace): AppThunk =>
    async dispatch => {
      await dispatch(devWorkspacesActionCreators.requestWorkspace(workspace.ref));
    },

  startWorkspace:
    (workspace: Workspace, params?: ResourceQueryParams): AppThunk =>
    async dispatch => {
      const debugWorkspace = params && params['debug-workspace-start'];
      await dispatch(devWorkspacesActionCreators.startWorkspace(workspace.ref, debugWorkspace));
    },

  restartWorkspace:
    (workspace: Workspace): AppThunk =>
    async dispatch => {
      await dispatch(devWorkspacesActionCreators.restartWorkspace(workspace.ref));
    },

  stopWorkspace:
    (workspace: Workspace): AppThunk =>
    async dispatch => {
      await dispatch(devWorkspacesActionCreators.stopWorkspace(workspace.ref));
    },

  deleteWorkspace:
    (workspace: Workspace): AppThunk =>
    async dispatch => {
      await dispatch(devWorkspacesActionCreators.terminateWorkspace(workspace.ref));
    },

  updateWorkspace:
    (workspace: Workspace): AppThunk =>
    async dispatch => {
      await dispatch(
        devWorkspacesActionCreators.updateWorkspace(workspace.ref as devfileApi.DevWorkspace),
      );
    },

  updateWorkspaceWithDefaultDevfile:
    (workspace: Workspace): AppThunk =>
    async dispatch => {
      await dispatch(
        devWorkspacesActionCreators.updateWorkspaceWithDefaultDevfile(
          workspace.ref as devfileApi.DevWorkspace,
        ),
      );
    },

  createWorkspaceFromResources:
    (
      ...args: Parameters<typeof devWorkspacesActionCreators.createWorkspaceFromResources>
    ): AppThunk =>
    async dispatch => {
      await dispatch(devWorkspacesActionCreators.createWorkspaceFromResources(...args));
    },

  createWorkspaceFromDevfile:
    (
      devfile: devfileApi.Devfile,
      attributes: Partial<FactoryParams>,
      optionalFilesContent?: {
        [fileName: string]: { location: string; content: string } | undefined;
      },
    ): AppThunk =>
    async dispatch => {
      await dispatch(
        devWorkspacesActionCreators.createWorkspaceFromDevfile(
          devfile,
          attributes,
          optionalFilesContent || {},
        ),
      );
    },

  setWorkspaceQualifiedName:
    (namespace: string, workspaceName: string): AppThunk<void> =>
    dispatch => {
      dispatch(qualifiedNameSetAction({ namespace, workspaceName }));
    },

  clearWorkspaceQualifiedName: (): AppThunk<void> => dispatch => {
    dispatch(qualifiedNameClearAction());
  },

  setWorkspaceUID:
    (workspaceUID: string): AppThunk<void> =>
    dispatch => {
      dispatch(workspaceUIDSetAction(workspaceUID));
    },

  clearWorkspaceUID: (): AppThunk<void> => dispatch => {
    dispatch(workspaceUIDClearAction());
  },
};
