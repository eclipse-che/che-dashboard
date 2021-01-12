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
import { AppThunk } from '../';
import { container } from '../../inversify.config';
import { CheWorkspaceClient } from '../../services/cheWorkspaceClient';
import { WorkspaceStatus } from '../../services/helpers/types';
import { createState } from '../helpers';

const WorkspaceClient = container.get(CheWorkspaceClient);

// This state defines the type of data maintained in the Redux store.
export interface State {
  isLoading: boolean;
  settings: che.WorkspaceSettings;
  workspaces: che.Workspace[];
  // runtime logs
  workspacesLogs: Map<string, string[]>;
  // current workspace qualified name
  namespace: string;
  workspaceName: string;
  workspaceId: string;
  // number of recent workspaces
  recentNumber: number;
}

interface RequestWorkspacesAction {
  type: 'REQUEST_WORKSPACES';
}

interface ReceiveErrorAction {
  type: 'RECEIVE_ERROR';
}

interface ReceiveWorkspacesAction {
  type: 'RECEIVE_WORKSPACES';
  workspaces: che.Workspace[];
}

interface UpdateWorkspaceAction {
  type: 'UPDATE_WORKSPACE';
  workspace: che.Workspace;
}

interface UpdateWorkspaceStatusAction extends Action {
  type: 'UPDATE_WORKSPACE_STATUS';
  workspaceId: string;
  status: string;
}

interface UpdateWorkspacesLogsAction extends Action {
  type: 'UPDATE_WORKSPACES_LOGS';
  workspacesLogs: Map<string, string[]>;
}

interface DeleteWorkspaceLogsAction {
  type: 'DELETE_WORKSPACE_LOGS';
  workspaceId: string;
}

interface DeleteWorkspaceAction {
  type: 'DELETE_WORKSPACE';
  workspaceId: string;
}

interface AddWorkspaceAction {
  type: 'ADD_WORKSPACE';
  workspace: che.Workspace;
}

interface ReceiveSettingsAction {
  type: 'RECEIVE_SETTINGS';
  settings: che.WorkspaceSettings;
}

interface SetWorkspaceQualifiedName {
  type: 'SET_WORKSPACE_NAME';
  namespace: string;
  workspaceName: string;
}

interface ClearWorkspaceQualifiedName {
  type: 'CLEAR_WORKSPACE_NAME';
}

interface SetWorkspaceId {
  type: 'SET_WORKSPACE_ID';
  workspaceId: string;
}

interface ClearWorkspaceId {
  type: 'CLEAR_WORKSPACE_ID';
}

type KnownAction =
  RequestWorkspacesAction
  | ReceiveErrorAction
  | ReceiveWorkspacesAction
  | UpdateWorkspaceAction
  | DeleteWorkspaceAction
  | AddWorkspaceAction
  | ReceiveSettingsAction
  | SetWorkspaceQualifiedName
  | ClearWorkspaceQualifiedName
  | SetWorkspaceId
  | ClearWorkspaceId
  | UpdateWorkspaceStatusAction
  | UpdateWorkspacesLogsAction
  | DeleteWorkspaceLogsAction;

export type ResourceQueryParams = {
  [propName: string]: string | boolean | undefined;
}
export type ActionCreators = {
  requestWorkspaces: () => AppThunk<KnownAction, Promise<void>>;
  requestWorkspace: (workspaceId: string) => AppThunk<KnownAction, Promise<void>>;
  startWorkspace: (workspaceId: string, params?: ResourceQueryParams) => AppThunk<KnownAction, Promise<void>>;
  stopWorkspace: (workspaceId: string) => AppThunk<KnownAction, Promise<void>>;
  deleteWorkspace: (workspaceId: string) => AppThunk<KnownAction, Promise<void>>;
  updateWorkspace: (workspace: che.Workspace) => AppThunk<KnownAction, Promise<void>>;
  createWorkspaceFromDevfile: (
    devfile: api.che.workspace.devfile.Devfile,
    namespace: string | undefined,
    infrastructureNamespace: string | undefined,
    attributes: { [key: string]: string } | {},
  ) => AppThunk<KnownAction, Promise<che.Workspace>>;
  requestSettings: () => AppThunk<KnownAction, Promise<void>>;

  setWorkspaceQualifiedName: (namespace: string, workspaceName: string) => AppThunk<SetWorkspaceQualifiedName>;
  clearWorkspaceQualifiedName: () => AppThunk<ClearWorkspaceQualifiedName>;
  setWorkspaceId: (workspaceId: string) => AppThunk<SetWorkspaceId>;
  clearWorkspaceId: () => AppThunk<ClearWorkspaceId>;
  deleteWorkspaceLogs: (workspaceId: string) => AppThunk<KnownAction>;
};

type WorkspaceStatusMessageHandler = (message: api.che.workspace.event.WorkspaceStatusEvent) => void;
type EnvironmentOutputMessageHandler = (message: api.che.workspace.event.RuntimeLogEvent) => void;
const subscribedWorkspaceStatusCallbacks = new Map<string, WorkspaceStatusMessageHandler>();
const subscribedEnvironmentOutputCallbacks = new Map<string, EnvironmentOutputMessageHandler>();

function subscribeToStatusChange(
  workspaceId: string,
  dispatch: ThunkDispatch<State, undefined, UpdateWorkspaceStatusAction | UpdateWorkspacesLogsAction | DeleteWorkspaceLogsAction>): void {
  const callback = message => {
    let status: string;
    if (message.error) {
      const workspacesLogs = new Map<string, string[]>();
      workspacesLogs.set(workspaceId, [`Error: Failed to run the workspace: "${message.error}"`]);
      dispatch({
        type: 'UPDATE_WORKSPACES_LOGS',
        workspacesLogs,
      });
      status = WorkspaceStatus[WorkspaceStatus.ERROR];
    } else {
      status = message.status;
    }
    if (WorkspaceStatus[status]) {
      dispatch({
        type: 'UPDATE_WORKSPACE_STATUS',
        workspaceId,
        status,
      });
    }
    if (WorkspaceStatus[WorkspaceStatus.STARTING] !== status) {
      unSubscribeToEnvironmentOutput(workspaceId);
    }
  };
  WorkspaceClient.jsonRpcMasterApi.subscribeWorkspaceStatus(workspaceId, callback);
  subscribedWorkspaceStatusCallbacks.set(workspaceId, callback);
}

function unSubscribeToStatusChange(workspaceId: string): void {
  const callback = subscribedWorkspaceStatusCallbacks.get(workspaceId);
  if (!callback) {
    return;
  }
  WorkspaceClient.jsonRpcMasterApi.unSubscribeWorkspaceStatus(workspaceId, callback);
  subscribedWorkspaceStatusCallbacks.delete(workspaceId);
}

function subscribeToEnvironmentOutput(workspaceId: string, dispatch: ThunkDispatch<State, undefined, UpdateWorkspacesLogsAction | DeleteWorkspaceLogsAction>): void {
  const callback: EnvironmentOutputMessageHandler = message => {
    if (message.runtimeId?.workspaceId === workspaceId && message.text) {
      const workspacesLogs = new Map<string, string[]>();
      workspacesLogs.set(workspaceId, [`${message.text}`]);
      dispatch({
        type: 'UPDATE_WORKSPACES_LOGS',
        workspacesLogs,
      });
    }
  };
  dispatch({
    type: 'DELETE_WORKSPACE_LOGS',
    workspaceId,
  });
  WorkspaceClient.jsonRpcMasterApi.subscribeEnvironmentOutput(workspaceId, callback);
  subscribedEnvironmentOutputCallbacks.set(workspaceId, callback);
}

function unSubscribeToEnvironmentOutput(workspaceId: string): void {
  const callback = subscribedEnvironmentOutputCallbacks.get(workspaceId);
  if (!callback) {
    return;
  }
  WorkspaceClient.jsonRpcMasterApi.unSubscribeEnvironmentOutput(workspaceId, callback);
  subscribedEnvironmentOutputCallbacks.delete(workspaceId);
}

// ACTION CREATORS - These are functions exposed to UI components that will trigger a state transition.
// They don't directly mutate state, but they can have external side-effects (such as loading data).
export const actionCreators: ActionCreators = {

  requestWorkspaces: (): AppThunk<KnownAction, Promise<void>> => async (dispatch): Promise<void> => {
    dispatch({ type: 'REQUEST_WORKSPACES' });

    try {
      const workspaces = await WorkspaceClient.restApiClient.getAll<che.Workspace>();

      // Unsubscribe
      subscribedWorkspaceStatusCallbacks.forEach((workspaceStatusCallback: WorkspaceStatusMessageHandler, workspaceId: string) => {
        unSubscribeToStatusChange(workspaceId);
      });

      // Subscribe
      workspaces.forEach(workspace => {
        subscribeToStatusChange(workspace.id, dispatch);
      });

      dispatch({ type: 'RECEIVE_WORKSPACES', workspaces });
    } catch (e) {
      dispatch({ type: 'RECEIVE_ERROR' });
      throw new Error('Failed to request workspaces: \n' + e);
    }

  },

  requestWorkspace: (workspaceId: string): AppThunk<KnownAction, Promise<void>> => async (dispatch): Promise<void> => {
    dispatch({ type: 'REQUEST_WORKSPACES' });

    try {
      const workspace = await WorkspaceClient.restApiClient.getById<che.Workspace>(workspaceId);
      dispatch({ type: 'UPDATE_WORKSPACE', workspace });
    } catch (e) {
      dispatch({ type: 'RECEIVE_ERROR' });
      const message = e.response && e.response.data && e.response.data.message ? e.response.data.message : e.message;
      throw new Error(`Failed to update. ${message}`);
    }
  },

  requestSettings: (): AppThunk<KnownAction, Promise<void>> => async (dispatch): Promise<void> => {
    dispatch({ type: 'REQUEST_WORKSPACES' });

    try {
      const settings = await WorkspaceClient.restApiClient.getSettings<che.WorkspaceSettings>();
      dispatch({ type: 'RECEIVE_SETTINGS', settings });
    } catch (e) {
      dispatch({ type: 'RECEIVE_ERROR' });
      throw new Error('Failed to fetch settings, \n' + e);
    }
  },

  startWorkspace: (workspaceId: string, params?: ResourceQueryParams): AppThunk<KnownAction, Promise<void>> => async (dispatch): Promise<void> => {
    try {
      const workspace = await WorkspaceClient.restApiClient.start<che.Workspace>(workspaceId, params);
      subscribeToEnvironmentOutput(workspaceId, dispatch);
      dispatch({ type: 'UPDATE_WORKSPACE', workspace });
    } catch (e) {
      dispatch({ type: 'RECEIVE_ERROR' });
      throw new Error(e.message);
    }
  },

  stopWorkspace: (workspaceId: string): AppThunk<KnownAction, Promise<void>> => async (dispatch): Promise<void> => {
    try {
      await WorkspaceClient.restApiClient.stop(workspaceId);
    } catch (e) {
      dispatch({ type: 'RECEIVE_ERROR' });
      throw new Error(`Failed to stop the workspace, ID: ${workspaceId}, ` + e.message);
    }
  },

  deleteWorkspace: (workspaceId: string): AppThunk<KnownAction, Promise<void>> => async (dispatch): Promise<void> => {
    try {
      await WorkspaceClient.restApiClient.delete(workspaceId);
      dispatch({ type: 'DELETE_WORKSPACE_LOGS', workspaceId });
      dispatch({ type: 'DELETE_WORKSPACE', workspaceId });
    } catch (e) {
      dispatch({ type: 'RECEIVE_ERROR' });
      throw new Error(`Failed to delete the workspace, ID: ${workspaceId}, ` + e.message);
    }
  },

  updateWorkspace: (workspace: che.Workspace): AppThunk<KnownAction, Promise<void>> => async (dispatch): Promise<void> => {
    dispatch({ type: 'REQUEST_WORKSPACES' });

    try {
      const updatedWorkspace = await WorkspaceClient.restApiClient.update<che.Workspace>(workspace.id, workspace as api.che.workspace.Workspace);
      dispatch({ type: 'UPDATE_WORKSPACE', workspace: updatedWorkspace });
    } catch (e) {
      dispatch({ type: 'RECEIVE_ERROR' });
      const message = e.response && e.response.data && e.response.data.message ? e.response.data.message : e.message;
      throw new Error(`Failed to update. ${message}`);
    }
  },

  createWorkspaceFromDevfile: (
    devfile: api.che.workspace.devfile.Devfile,
    namespace: string | undefined,
    infrastructureNamespace: string | undefined,
    attributes: { [key: string]: string } = {},
  ): AppThunk<KnownAction, Promise<che.Workspace>> => async (dispatch): Promise<che.Workspace> => {
    dispatch({ type: 'REQUEST_WORKSPACES' });
    try {
      const param = { attributes, namespace, infrastructureNamespace };
      const workspace = await WorkspaceClient.restApiClient.create<che.Workspace>(devfile, param);
      dispatch({ type: 'ADD_WORKSPACE', workspace });
      // Subscribe
      subscribeToStatusChange(workspace.id, dispatch);

      return workspace;
    } catch (e) {
      dispatch({ type: 'RECEIVE_ERROR' });
      throw new Error('Failed to create a new workspace from the devfile: \n' + e.message);
    }
  },

  setWorkspaceQualifiedName: (namespace: string, workspaceName: string): AppThunk<SetWorkspaceQualifiedName> => dispatch => {
    dispatch({
      type: 'SET_WORKSPACE_NAME',
      namespace,
      workspaceName,
    });
  },

  clearWorkspaceQualifiedName: (): AppThunk<ClearWorkspaceQualifiedName> => dispatch => {
    dispatch({ type: 'CLEAR_WORKSPACE_NAME' });
  },

  setWorkspaceId: (workspaceId: string): AppThunk<SetWorkspaceId> => dispatch => {
    dispatch({
      type: 'SET_WORKSPACE_ID',
      workspaceId,
    });
  },

  clearWorkspaceId: (): AppThunk<ClearWorkspaceId> => dispatch => {
    dispatch({ type: 'CLEAR_WORKSPACE_ID' });
  },

  deleteWorkspaceLogs: (workspaceId: string): AppThunk<KnownAction> => async (dispatch): Promise<void> => {
    dispatch({
      type: 'SET_WORKSPACE_ID',
      workspaceId,
    });
    dispatch({ type: 'DELETE_WORKSPACE_LOGS', workspaceId });
  },

};

const unloadedState: State = {
  workspaces: [],
  settings: {} as che.WorkspaceSettings,
  isLoading: false,

  workspacesLogs: new Map<string, string[]>(),

  namespace: '',
  workspaceName: '',
  workspaceId: '',

  recentNumber: 5,
};

const mapMerge = (originMap: Map<string, string[]>, additionalMap: Map<string, string[]>): Map<string, string[]> => {
  if (!originMap.size) {
    return additionalMap;
  }
  const res = new Map<string, string[]>();
  originMap.forEach((val: string[], key: string) => {
    const merge = (val: string[], newVal: string[] | undefined): string[] => {
      if (!newVal || (val.length > 0 && newVal.length === 1 && val[val.length - 1] === newVal[0])) {
        return val;
      }
      return val.concat(newVal);
    };
    res.set(key, merge(val, additionalMap.get(key)));
  });
  additionalMap.forEach((val: string[], key: string) => {
    if (!res.has(key)) {
      res.set(key, val);
    }
  });
  return res;
};

const mapDeleteKey = (originMap: Map<string, string[]>, key: string): Map<string, string[]> => {
  if (!originMap.size) {
    return originMap;
  }
  const res = new Map<string, string[]>(originMap.entries());
  res.delete(key);
  return res;
};

export const reducer: Reducer<State> = (state: State | undefined, action: KnownAction): State => {
  if (state === undefined) {
    return unloadedState;
  }

  switch (action.type) {
    case 'REQUEST_WORKSPACES':
      return createState(state, {
        isLoading: true,
      });
    case 'RECEIVE_ERROR':
      return createState(state, {
        isLoading: false,
      });
    case 'UPDATE_WORKSPACE':
      return createState(state, {
        isLoading: false,
        workspaces: state.workspaces.map(workspace => workspace.id === action.workspace.id ? action.workspace : workspace),
      });
    case 'UPDATE_WORKSPACE_STATUS':
      return createState(state, {
        workspaces: state.workspaces.map(workspace => {
          if (workspace.id === action.workspaceId) {
            workspace.status = action.status;
          }
          return workspace;
        }),
      });
    case 'ADD_WORKSPACE':
      return createState(state, {
        workspaces: state.workspaces.concat([action.workspace]),
      });
    case 'DELETE_WORKSPACE':
      return createState(state, {
        isLoading: false,
        workspaces: state.workspaces.filter(workspace => workspace.id !== action.workspaceId),
      });
    case 'RECEIVE_WORKSPACES':
      return createState(state, {
        isLoading: false,
        workspaces: action.workspaces,
      });
    case 'RECEIVE_SETTINGS':
      return createState(state, {
        isLoading: false,
        settings: action.settings,
      });
    case 'SET_WORKSPACE_NAME':
      return createState(state, {
        namespace: action.namespace,
        workspaceName: action.workspaceName,
      });
    case 'CLEAR_WORKSPACE_NAME':
      return createState(state, {
        namespace: '',
        workspaceName: '',
      });
    case 'SET_WORKSPACE_ID':
      return createState(state, {
        workspaceId: action.workspaceId,
      });
    case 'CLEAR_WORKSPACE_ID':
      return createState(state, {
        workspaceId: '',
      });
    case 'UPDATE_WORKSPACES_LOGS':
      return createState(state, {
        workspacesLogs: mapMerge(state.workspacesLogs, action.workspacesLogs),
      });
    case 'DELETE_WORKSPACE_LOGS':
      return createState(state, {
        workspacesLogs: mapDeleteKey(state.workspacesLogs, state.workspaceId),
      });
    default:
      return state;
  }

};
