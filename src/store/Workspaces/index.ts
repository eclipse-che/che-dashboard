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
import { CheWorkspaceClient } from '../../services/workspace-client/cheWorkspaceClient';
import { WorkspaceStatus } from '../../services/helpers/types';
import { createState } from '../helpers';
import { isDevWorkspace } from '../../services/helpers/devworkspace';
import { DevWorkspaceClient, IStatusUpdate } from '../../services/workspace-client/devWorkspaceClient';
import { IDevWorkspaceDevfile } from '@eclipse-che/devworkspace-client';
import { KeycloakAuthService } from '../../services/keycloak/auth';

const cheWorkspaceClient = container.get(CheWorkspaceClient);
const devWorkspaceClient = container.get(DevWorkspaceClient);
const keycloakAuthService = container.get(KeycloakAuthService);

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
  'debug-workspace-start': boolean;
  [propName: string]: string | boolean | undefined;
}
export type ActionCreators = {
  updateDevWorkspaceStatus: (workspace: che.Workspace, message: IStatusUpdate) => AppThunk<KnownAction, Promise<void>>;
  requestWorkspaces: () => AppThunk<KnownAction, Promise<void>>;
  requestWorkspace: (workspace: che.Workspace) => AppThunk<KnownAction, Promise<void>>;
  startWorkspace: (workspace: che.Workspace, params?: ResourceQueryParams) => AppThunk<KnownAction, Promise<void>>;
  stopWorkspace: (workspace: che.Workspace) => AppThunk<KnownAction, Promise<void>>;
  deleteWorkspace: (workspace: che.Workspace) => AppThunk<KnownAction, Promise<void>>;
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

function onStatusUpdateReceived(
  workspace: che.Workspace,
  dispatch: ThunkDispatch<State, undefined, UpdateWorkspaceStatusAction | UpdateWorkspacesLogsAction | DeleteWorkspaceLogsAction>,
  message: any) {
  let status: string;
  if (message.error) {
    const workspacesLogs = new Map<string, string[]>();
    workspacesLogs.set(workspace.id, [`Error: Failed to run the workspace: "${message.error}"`]);
    dispatch({
      type: 'UPDATE_WORKSPACES_LOGS',
      workspacesLogs,
    });
    // ignore an error if start interrupted by owner
    const re = /^Runtime start for identity 'workspace: (?:[\d\w]+), environment: (?:[\w\d]+), ownerId: (?:[-\d\w]+)' is interrupted$/;
    status = re.test(message.error) ? message.status : WorkspaceStatus[WorkspaceStatus.ERROR];
  } else {
    status = message.status;
  }
  if (WorkspaceStatus[status]) {
    dispatch({
      type: 'UPDATE_WORKSPACE_STATUS',
      workspaceId: workspace.id,
      status,
    });
  }
}

function subscribeToStatusChange(
  workspace: che.Workspace,
  dispatch: ThunkDispatch<State, undefined, UpdateWorkspaceStatusAction | UpdateWorkspacesLogsAction | DeleteWorkspaceLogsAction>): void {

  if (subscribedWorkspaceStatusCallbacks.has(workspace.id)) {
    return;
  }
  const callback = (message: any) => onStatusUpdateReceived(workspace, dispatch, message);
  cheWorkspaceClient.jsonRpcMasterApi.subscribeWorkspaceStatus(workspace.id, callback);
  subscribedWorkspaceStatusCallbacks.set(workspace.id, callback);
}

function subscribeToEnvironmentOutput(workspaceId: string, dispatch: ThunkDispatch<State, undefined, UpdateWorkspacesLogsAction | DeleteWorkspaceLogsAction>): void {
  if (subscribedEnvironmentOutputCallbacks.has(workspaceId)) {
    return;
  }
  const callback: EnvironmentOutputMessageHandler = message => {
    if (message.runtimeId?.workspaceId === workspaceId && message.text) {
      const workspacesLogs = new Map<string, string[]>();
      workspacesLogs.set(workspaceId, message.text.split(new RegExp('\\r\\n|\\r|\\n')));
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
  cheWorkspaceClient.jsonRpcMasterApi.subscribeEnvironmentOutput(workspaceId, callback);
  subscribedEnvironmentOutputCallbacks.set(workspaceId, callback);
}

// ACTION CREATORS - These are functions exposed to UI components that will trigger a state transition.
// They don't directly mutate state, but they can have external side-effects (such as loading data).
export const actionCreators: ActionCreators = {

  updateDevWorkspaceStatus: (workspace: che.Workspace, message: IStatusUpdate): AppThunk<KnownAction, Promise<void>> => async (dispatch): Promise<void> => {
    onStatusUpdateReceived(workspace, dispatch, message);
  },

  requestWorkspaces: (): AppThunk<KnownAction, Promise<void>> => async (dispatch, getState): Promise<void> => {
    dispatch({ type: 'REQUEST_WORKSPACES' });

    try {
      const state = getState();
      const workspaces = await cheWorkspaceClient.restApiClient.getAll<che.Workspace>();
      const defaultNamespace = await cheWorkspaceClient.getDefaultNamespace();
      let allWorkspaces = workspaces;
      const cheDevworkspaceEnabled = state.workspaces.settings['che.devworkspaces.enabled'] === 'true';
      if (cheDevworkspaceEnabled) {
        const devworkspaces = await devWorkspaceClient.getAllWorkspaces(defaultNamespace);
        allWorkspaces = allWorkspaces.concat(devworkspaces);
      }

      // Only subscribe to v1 workspaces
      workspaces.forEach(workspace => {
        subscribeToStatusChange(workspace, dispatch);

        if (WorkspaceStatus[WorkspaceStatus.STARTING] === workspace.status) {
          subscribeToEnvironmentOutput(workspace.id, dispatch);
        }
      });

      dispatch({ type: 'RECEIVE_WORKSPACES', workspaces: allWorkspaces });
    } catch (e) {
      dispatch({ type: 'RECEIVE_ERROR' });
      throw new Error('Failed to request workspaces: \n' + e);
    }

  },

  requestWorkspace: (cheWorkspace: che.Workspace): AppThunk<KnownAction, Promise<void>> => async (dispatch, getState): Promise<void> => {
    dispatch({ type: 'REQUEST_WORKSPACES' });

    try {
      const state = getState();
      let workspace: che.Workspace;
      const cheDevworkspaceEnabled = state.workspaces.settings['che.devworkspaces.enabled'] === 'true';
      if (cheDevworkspaceEnabled && isDevWorkspace(cheWorkspace)) {
        const namespace = cheWorkspace.namespace as string;
        const name = cheWorkspace.devfile.metadata.name;
        workspace = await devWorkspaceClient.getWorkspaceByName(namespace, name);
      } else {
        workspace = await cheWorkspaceClient.restApiClient.getById<che.Workspace>(cheWorkspace.id);
      }
      if (!subscribedWorkspaceStatusCallbacks.has(workspace.id)) {
        subscribeToStatusChange(workspace, dispatch);
      }
      if (workspace.status === WorkspaceStatus[WorkspaceStatus.STARTING]) {
        subscribeToEnvironmentOutput(cheWorkspace.id, dispatch);
      }
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
      const settings = await cheWorkspaceClient.restApiClient.getSettings<che.WorkspaceSettings>();

      // todo remove when server returns property https://github.com/eclipse/che/issues/19160#issuecomment-788753847
      if (settings['che.devworkspaces.enabled'] === undefined) {
        settings['che.devworkspaces.enabled'] = 'false';
      }

      dispatch({ type: 'RECEIVE_SETTINGS', settings });
    } catch (e) {
      dispatch({ type: 'RECEIVE_ERROR' });
      throw new Error('Failed to fetch settings, \n' + e);
    }
  },

  startWorkspace: (cheWorkspace: che.Workspace, params?: ResourceQueryParams): AppThunk<KnownAction, Promise<void>> => async (dispatch, getState): Promise<void> => {
    try {
      const state = getState();
      let workspace: che.Workspace;
      const cheDevworkspaceEnabled = state.workspaces.settings['che.devworkspaces.enabled'] === 'true';
      if (cheDevworkspaceEnabled && isDevWorkspace(cheWorkspace)) {
        workspace = await devWorkspaceClient.changeWorkspaceStatus(cheWorkspace.namespace as string, cheWorkspace.devfile.metadata.name as string, true);
      } else {
        await keycloakAuthService.forceUpdateToken();
        workspace = await cheWorkspaceClient.restApiClient.start<che.Workspace>(cheWorkspace.id, params);
        dispatch({ type: 'DELETE_WORKSPACE_LOGS', workspaceId: workspace.id });
        subscribeToEnvironmentOutput(cheWorkspace.id, dispatch);
      }
      dispatch({ type: 'UPDATE_WORKSPACE', workspace });
    } catch (e) {
      dispatch({ type: 'RECEIVE_ERROR' });
      throw new Error(e.message);
    }
  },

  stopWorkspace: (workspace: che.Workspace): AppThunk<KnownAction, Promise<void>> => async (dispatch, getState): Promise<void> => {
    try {
      const state = getState();
      const cheDevworkspaceEnabled = state.workspaces.settings['che.devworkspaces.enabled'] === 'true';
      if (cheDevworkspaceEnabled && isDevWorkspace(workspace)) {
        devWorkspaceClient.changeWorkspaceStatus(workspace.namespace as string, workspace.devfile.metadata.name as string, false);
      } else {
        cheWorkspaceClient.restApiClient.stop(workspace.id);
      }
    } catch (e) {
      dispatch({ type: 'RECEIVE_ERROR' });
      throw new Error(`Failed to stop the workspace, ID: ${workspace.id}, ` + e.message);
    }
  },

  deleteWorkspace: (workspace: che.Workspace): AppThunk<KnownAction, Promise<void>> => async (dispatch, getState): Promise<void> => {
    try {
      const state = getState();
      const cheDevworkspaceEnabled = state.workspaces.settings['che.devworkspaces.enabled'] === 'true';
      if (cheDevworkspaceEnabled && isDevWorkspace(workspace)) {
        const namespace = workspace.namespace as string;
        const name = workspace.devfile.metadata.name;
        await devWorkspaceClient.delete(namespace, name);
        dispatch({ type: 'DELETE_WORKSPACE', workspaceId: workspace.id });
      } else {
        await cheWorkspaceClient.restApiClient.delete(workspace.id);
        dispatch({ type: 'DELETE_WORKSPACE_LOGS', workspaceId: workspace.id });
        dispatch({ type: 'DELETE_WORKSPACE', workspaceId: workspace.id });
      }
    } catch (e) {
      dispatch({ type: 'RECEIVE_ERROR' });

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

      throw new Error(`Failed to delete the workspace, ID: ${workspace.id}. ` + message);
    }
  },

  updateWorkspace: (workspace: che.Workspace): AppThunk<KnownAction, Promise<void>> => async (dispatch): Promise<void> => {
    dispatch({ type: 'REQUEST_WORKSPACES' });

    try {
      const updatedWorkspace = await cheWorkspaceClient.restApiClient.update<che.Workspace>(workspace.id, workspace as api.che.workspace.Workspace);
      dispatch({ type: 'UPDATE_WORKSPACE', workspace: updatedWorkspace });
    } catch (e) {
      dispatch({ type: 'RECEIVE_ERROR' });
      const message = e.response && e.response.data && e.response.data.message ? e.response.data.message : e.message;
      throw new Error(`Failed to update. ${message}`);
    }
  },

  createWorkspaceFromDevfile: (
    devfile: api.che.workspace.devfile.Devfile | IDevWorkspaceDevfile,
    namespace: string | undefined,
    infrastructureNamespace: string | undefined,
    attributes: { [key: string]: string } = {},
  ): AppThunk<KnownAction, Promise<che.Workspace>> => async (dispatch, getState): Promise<che.Workspace> => {
    dispatch({ type: 'REQUEST_WORKSPACES' });
    try {
      const state = getState();
      const param = { attributes, namespace, infrastructureNamespace };
      let workspace: che.Workspace;
      const cheDevworkspaceEnabled = state.workspaces.settings['che.devworkspaces.enabled'] === 'true';
      if (cheDevworkspaceEnabled && isDevWorkspace(devfile)) {
        // If the devworkspace doesn't have a namespace then we assign it to the default kubernetesNamespace
        const devWorkspaceDevfile = devfile as IDevWorkspaceDevfile;
        if (!devWorkspaceDevfile.metadata.namespace) {
          const defaultNamespace = await cheWorkspaceClient.getDefaultNamespace();
          devWorkspaceDevfile.metadata.namespace = defaultNamespace;
        }

        const dwPlugins = state.dwPlugins.plugins;
        workspace = await devWorkspaceClient.create(devWorkspaceDevfile, dwPlugins);
      } else {
        workspace = await cheWorkspaceClient.restApiClient.create<che.Workspace>(devfile, param);

        // Subscribe
        subscribeToStatusChange(workspace, dispatch);
      }
      dispatch({ type: 'ADD_WORKSPACE', workspace });
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

export const mapMerge = (originMap: Map<string, string[]>, additionalMap: Map<string, string[]>): Map<string, string[]> => {
  if (!originMap.size) {
    return additionalMap;
  }
  const res = new Map<string, string[]>();
  originMap.forEach((val: string[], key: string) => {
    const merge = (val: string[], newVal: string[] | undefined): string[] => {
      if (!newVal) {
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
