/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { Action, Reducer } from 'redux';
import * as api from '@eclipse-che/api';
import { ThunkDispatch } from 'redux-thunk';
import { AppThunk } from '../..';
import { container } from '../../../inversify.config';
import { DevWorkspaceStatus, WorkspaceStatus } from '../../../services/helpers/types';
import { createState } from '../../helpers';
import { DevWorkspaceClient, IStatusUpdate } from '../../../services/workspace-client/devWorkspaceClient';
import { CheWorkspaceClient } from '../../../services/workspace-client/cheWorkspaceClient';
import { IDevWorkspace, IDevWorkspaceDevfile } from '@eclipse-che/devworkspace-client';
import { deleteLogs, mergeLogs } from '../logs';

const cheWorkspaceClient = container.get(CheWorkspaceClient);
const devWorkspaceClient = container.get(DevWorkspaceClient);

export interface State {
  isLoading: boolean;
  workspaces: IDevWorkspace[];
  // runtime logs
  workspacesLogs: Map<string, string[]>;
}

interface RequestDevWorkspacesAction extends Action {
  type: 'DEV_REQUEST_WORKSPACES';
}

interface ReceiveErrorAction extends Action {
  type: 'DEV_RECEIVE_ERROR';
}

interface ReceiveWorkspacesAction extends Action {
  type: 'DEV_RECEIVE_WORKSPACES';
  workspaces: IDevWorkspace[];
}

interface UpdateWorkspaceAction extends Action {
  type: 'DEV_UPDATE_WORKSPACE';
  workspace: IDevWorkspace;
}

interface UpdateWorkspaceStatusAction extends Action {
  type: 'DEV_UPDATE_WORKSPACE_STATUS';
  workspaceId: string;
  status: string;
}

interface UpdateWorkspacesLogsAction extends Action {
  type: 'DEV_UPDATE_WORKSPACES_LOGS';
  workspacesLogs: Map<string, string[]>;
}

interface DeleteWorkspaceLogsAction extends Action {
  type: 'DEV_DELETE_WORKSPACE_LOGS';
  workspaceId: string;
}

interface DeleteWorkspaceAction extends Action {
  type: 'DEV_DELETE_WORKSPACE';
  workspaceId: string;
}

interface AddWorkspaceAction extends Action {
  type: 'DEV_ADD_WORKSPACE';
  workspace: IDevWorkspace;
}

type KnownAction =
  RequestDevWorkspacesAction
  | ReceiveErrorAction
  | ReceiveWorkspacesAction
  | UpdateWorkspaceAction
  | DeleteWorkspaceAction
  | AddWorkspaceAction
  | UpdateWorkspaceStatusAction
  | UpdateWorkspacesLogsAction
  | DeleteWorkspaceLogsAction;

export type ResourceQueryParams = {
  'debug-workspace-start': boolean;
  [propName: string]: string | boolean | undefined;
}
export type ActionCreators = {
  updateDevWorkspaceStatus: (workspace: IDevWorkspace, message: IStatusUpdate) => AppThunk<KnownAction, void>;
  requestWorkspaces: () => AppThunk<KnownAction, Promise<void>>;
  requestWorkspace: (workspace: IDevWorkspace) => AppThunk<KnownAction, Promise<void>>;
  startWorkspace: (workspace: IDevWorkspace) => AppThunk<KnownAction, Promise<void>>;
  stopWorkspace: (workspace: IDevWorkspace) => AppThunk<KnownAction, Promise<void>>;
  deleteWorkspace: (workspace: IDevWorkspace) => AppThunk<KnownAction, Promise<void>>;
  updateWorkspace: (workspace: IDevWorkspace) => AppThunk<KnownAction, Promise<void>>;
  createWorkspaceFromDevfile: (devfile: IDevWorkspaceDevfile) => AppThunk<KnownAction, Promise<IDevWorkspace>>;

  deleteWorkspaceLogs: (workspaceId: string) => AppThunk<DeleteWorkspaceLogsAction, void>;
};

type WorkspaceStatusMessageHandler = (message: api.che.workspace.event.WorkspaceStatusEvent) => void;
type EnvironmentOutputMessageHandler = (message: api.che.workspace.event.RuntimeLogEvent) => void;

export const actionCreators: ActionCreators = {

  updateDevWorkspaceStatus: (workspace: IDevWorkspace, message: IStatusUpdate): AppThunk<KnownAction, void> => (dispatch): void => {
    onStatusUpdateReceived(workspace, dispatch, message);
  },

  requestWorkspaces: (): AppThunk<KnownAction, Promise<void>> => async (dispatch): Promise<void> => {
    dispatch({ type: 'DEV_REQUEST_WORKSPACES' });

    try {
      const defaultNamespace = await cheWorkspaceClient.getDefaultNamespace();
      const workspaces = await devWorkspaceClient.getAllWorkspaces(defaultNamespace);

      dispatch({
        type: 'DEV_RECEIVE_WORKSPACES',
        workspaces,
      });
    } catch (e) {
      dispatch({ type: 'DEV_RECEIVE_ERROR' });
      throw new Error('Failed to request workspaces: \n' + e);
    }

  },

  requestWorkspace: (workspace: IDevWorkspace): AppThunk<KnownAction, Promise<void>> => async (dispatch): Promise<void> => {
    dispatch({ type: 'DEV_REQUEST_WORKSPACES' });

    try {
      const namespace = workspace.metadata.namespace;
      const name = workspace.metadata.name;
      const update = await devWorkspaceClient.getWorkspaceByName(namespace, name);
      dispatch({
        type: 'DEV_UPDATE_WORKSPACE',
        workspace: update,
      });
    } catch (e) {
      dispatch({ type: 'DEV_RECEIVE_ERROR' });
      const message = e.response?.data?.message ? e.response.data.message : e.message;
      throw new Error(`Failed to update. ${message}`);
    }
  },

  startWorkspace: (workspace: IDevWorkspace): AppThunk<KnownAction, Promise<void>> => async (dispatch): Promise<void> => {
    dispatch({ type: 'DEV_REQUEST_WORKSPACES' });
    try {
      const update = await devWorkspaceClient.changeWorkspaceStatus(workspace.metadata.namespace, workspace.metadata.name, true);
      dispatch({
        type: 'DEV_UPDATE_WORKSPACE',
        workspace: update,
      });
    } catch (e) {
      dispatch({ type: 'DEV_RECEIVE_ERROR' });
      throw new Error(e.message);
    }
  },

  stopWorkspace: (workspace: IDevWorkspace): AppThunk<KnownAction, Promise<void>> => async (dispatch): Promise<void> => {
    try {
      devWorkspaceClient.changeWorkspaceStatus(workspace.metadata.namespace, workspace.metadata.name, false);
      dispatch({ type: 'DEV_DELETE_WORKSPACE_LOGS', workspaceId: workspace.status.devworkspaceId });
    } catch (e) {
      dispatch({ type: 'DEV_RECEIVE_ERROR' });
      throw new Error(`Failed to stop the workspace, ID: ${workspace.status.devworkspaceId}, ` + e.message);
    }
  },

  deleteWorkspace: (workspace: IDevWorkspace): AppThunk<KnownAction, Promise<void>> => async (dispatch): Promise<void> => {
    try {
      const namespace = workspace.metadata.namespace;
      const name = workspace.metadata.name;
      await devWorkspaceClient.delete(namespace, name);
      const workspaceId = workspace.status.devworkspaceId;
      dispatch({
        type: 'DEV_DELETE_WORKSPACE',
        workspaceId,
      });
      dispatch({ type: 'DEV_DELETE_WORKSPACE_LOGS', workspaceId });
    } catch (e) {
      dispatch({ type: 'DEV_RECEIVE_ERROR' });

      const errorMessage = e?.message || '';
      const code = e?.response?.status || '';
      const statusText = e?.response?.statusText || '';
      const responseMessage = e?.response?.data?.message || '';

      let message: string;
      if (responseMessage) {
        message = responseMessage;
      } else if (errorMessage) {
        message = errorMessage;
      } else if (code && statusText) {
        message = `Response code ${code}, ${statusText}.`;
      } else {
        message = 'Unknown error.';
      }

      throw new Error(`Failed to delete the workspace, ID: ${workspace.status.devworkspaceId}. ` + message);
    }
  },

  updateWorkspace: (workspace: IDevWorkspace): AppThunk<KnownAction, Promise<void>> => async (dispatch): Promise<void> => {
    dispatch({ type: 'DEV_REQUEST_WORKSPACES' });

    try {
      const updated = await devWorkspaceClient.update(workspace);
      dispatch({
        type: 'DEV_UPDATE_WORKSPACE',
        workspace: updated,
      });
    } catch (e) {
      dispatch({ type: 'DEV_RECEIVE_ERROR' });
      const message = e.response && e.response.data && e.response.data.message ? e.response.data.message : e.message;
      throw new Error(`Failed to update. ${message}`);
    }
  },

  createWorkspaceFromDevfile: (devfile: IDevWorkspaceDevfile): AppThunk<KnownAction, Promise<IDevWorkspace>> => async (dispatch, getState): Promise<IDevWorkspace> => {
    dispatch({ type: 'DEV_REQUEST_WORKSPACES' });
    try {
      const state = getState();

      // If the devworkspace doesn't have a namespace then we assign it to the default kubernetesNamespace
      const devWorkspaceDevfile = devfile as IDevWorkspaceDevfile;
      if (!devWorkspaceDevfile.metadata.namespace) {
        const defaultNamespace = await cheWorkspaceClient.getDefaultNamespace();
        devWorkspaceDevfile.metadata.namespace = defaultNamespace;
      }

      const dwPlugins = state.dwPlugins.plugins;
      const workspace = await devWorkspaceClient.create(devWorkspaceDevfile, dwPlugins);

      dispatch({
        type: 'DEV_ADD_WORKSPACE',
        workspace,
      });
      return workspace;
    } catch (e) {
      dispatch({ type: 'DEV_RECEIVE_ERROR' });
      throw new Error('Failed to create a new workspace from the devfile: \n' + e.message);
    }
  },

  deleteWorkspaceLogs: (workspaceId: string): AppThunk<DeleteWorkspaceLogsAction, void> => (dispatch): void => {
    dispatch({ type: 'DEV_DELETE_WORKSPACE_LOGS', workspaceId });
  },

};

const unloadedState: State = {
  workspaces: [],
  isLoading: false,

  workspacesLogs: new Map<string, string[]>(),
};

export const reducer: Reducer<State> = (state: State | undefined, action: KnownAction): State => {
  if (state === undefined) {
    return unloadedState;
  }

  switch (action.type) {
    case 'DEV_REQUEST_WORKSPACES':
      return createState(state, {
        isLoading: true,
      });
    case 'DEV_RECEIVE_WORKSPACES':
      return createState(state, {
        isLoading: false,
        workspaces: action.workspaces,
      });
    case 'DEV_RECEIVE_ERROR':
      return createState(state, {
        isLoading: false,
      });
    case 'DEV_UPDATE_WORKSPACE':
      return createState(state, {
        isLoading: false,
        workspaces: state.workspaces.map(workspace => workspace.status.devworkspaceId === action.workspace.status.devworkspaceId ? action.workspace : workspace),
      });
    case 'DEV_UPDATE_WORKSPACE_STATUS':
      return createState(state, {
        workspaces: state.workspaces.map(workspace => {
          if (workspace.status.devworkspaceId === action.workspaceId) {
            workspace.status.phase = action.status;
          }
          return workspace;
        }),
      });
    case 'DEV_ADD_WORKSPACE':
      return createState(state, {
        workspaces: state.workspaces.concat([action.workspace]),
      });
    case 'DEV_DELETE_WORKSPACE':
      return createState(state, {
        isLoading: false,
        workspaces: state.workspaces.filter(workspace => workspace.status.devworkspaceId !== action.workspaceId),
      });
    case 'DEV_UPDATE_WORKSPACES_LOGS':
      return createState(state, {
        workspacesLogs: mergeLogs(state.workspacesLogs, action.workspacesLogs),
      });
    case 'DEV_DELETE_WORKSPACE_LOGS':
      return createState(state, {
        workspacesLogs: deleteLogs(state.workspacesLogs, action.workspaceId),
      });
    default:
      return state;
  }

};

function onStatusUpdateReceived(
  workspace: IDevWorkspace,
  dispatch: ThunkDispatch<State, undefined, KnownAction>,
  statusUpdate: IStatusUpdate) {
  let status: string | undefined;
  if (statusUpdate.error) {
    const workspacesLogs = new Map<string, string[]>();
    workspacesLogs.set(workspace.status.devworkspaceId, [`Error: Failed to run the workspace: "${statusUpdate.error}"`]);
    dispatch({
      type: 'DEV_UPDATE_WORKSPACES_LOGS',
      workspacesLogs,
    });
    status = WorkspaceStatus[WorkspaceStatus.ERROR];
  } else {
    if (statusUpdate.message) {
      const workspacesLogs = new Map<string, string[]>();

      /**
       * Don't add in messages with no workspaces id or with stopped or stopping messages. The stopped and stopping messages
       * only appear because we initially create a stopped devworkspace, add in devworkspace templates, and then start the devworkspace
       */
      if (workspace.status.devworkspaceId !== '' && workspace.status.message !== DevWorkspaceStatus.STOPPED && workspace.status.message !== DevWorkspaceStatus.STOPPING) {
        workspacesLogs.set(workspace.status.devworkspaceId, [statusUpdate.message]);
        dispatch({
          type: 'DEV_UPDATE_WORKSPACES_LOGS',
          workspacesLogs,
        });
      }
    }
    status = statusUpdate.status;
  }
  if (status && WorkspaceStatus[status]) {
    dispatch({
      type: 'DEV_UPDATE_WORKSPACE_STATUS',
      workspaceId: workspace.status.devworkspaceId,
      status,
    });
  }
}
