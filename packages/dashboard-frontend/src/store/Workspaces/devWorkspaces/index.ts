/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
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
import { ThunkDispatch } from 'redux-thunk';
import common from '@eclipse-che/common';
import { AppThunk } from '../..';
import { container } from '../../../inversify.config';
import { DevWorkspaceStatus } from '../../../services/helpers/types';
import { createObject } from '../../helpers';
import { DevWorkspaceClient, DEVWORKSPACE_NEXT_START_ANNOTATION, IStatusUpdate } from '../../../services/workspace-client/devworkspace/devWorkspaceClient';
import { CheWorkspaceClient } from '../../../services/workspace-client/cheworkspace/cheWorkspaceClient';
import devfileApi, { isDevWorkspace } from '../../../services/devfileApi';
import { deleteLogs, mergeLogs } from '../logs';
import { getDefer, IDeferred } from '../../../services/helpers/deferred';
import { DisposableCollection } from '../../../services/helpers/disposable';
import { selectDwPluginsList } from '../../Plugins/devWorkspacePlugins/selectors';
import { getId } from '../../../services/workspace-adapter/helper';
import { devWorkspaceKind } from '../../../services/devfileApi/devWorkspace';

const cheWorkspaceClient = container.get(CheWorkspaceClient);
const devWorkspaceClient = container.get(DevWorkspaceClient);

const devWorkspaceStatusMap = new Map<string, string | undefined>();
const onStatusChangeCallbacks = new Map<string, (status: string) => void>();

export interface State {
  isLoading: boolean;
  workspaces: devfileApi.DevWorkspace[];
  resourceVersion?: string;
  error?: string;
  // runtime logs
  workspacesLogs: Map<string, string[]>;
}

interface RequestDevWorkspacesAction extends Action {
  type: 'REQUEST_DEVWORKSPACE';
}

interface ReceiveErrorAction extends Action {
  type: 'RECEIVE_DEVWORKSPACE_ERROR';
  error: string;
}

interface ReceiveWorkspacesAction extends Action {
  type: 'RECEIVE_DEVWORKSPACE';
  workspaces: devfileApi.DevWorkspace[];
  resourceVersion: string;
}

interface UpdateWorkspaceAction extends Action {
  type: 'UPDATE_DEVWORKSPACE';
  workspace: devfileApi.DevWorkspace;
}

interface UpdateWorkspaceStatusAction extends Action {
  type: 'UPDATE_DEVWORKSPACE_STATUS';
  workspaceId: string;
  status: string;
}

interface UpdateWorkspacesLogsAction extends Action {
  type: 'UPDATE_DEVWORKSPACE_LOGS';
  workspacesLogs: Map<string, string[]>;
}

interface DeleteWorkspaceLogsAction extends Action {
  type: 'DELETE_DEVWORKSPACE_LOGS';
  workspaceId: string;
}

interface DeleteWorkspaceAction extends Action {
  type: 'DELETE_DEVWORKSPACE';
  workspaceId: string;
}

interface TerminateWorkspaceAction extends Action {
  type: 'TERMINATE_DEVWORKSPACE';
  workspaceId: string;
}

interface AddWorkspaceAction extends Action {
  type: 'ADD_DEVWORKSPACE';
  workspace: devfileApi.DevWorkspace;
}

type KnownAction =
  RequestDevWorkspacesAction
  | ReceiveErrorAction
  | ReceiveWorkspacesAction
  | UpdateWorkspaceAction
  | DeleteWorkspaceAction
  | TerminateWorkspaceAction
  | AddWorkspaceAction
  | UpdateWorkspaceStatusAction
  | UpdateWorkspacesLogsAction
  | DeleteWorkspaceLogsAction;

export type ResourceQueryParams = {
  'debug-workspace-start': boolean;
  [propName: string]: string | boolean | undefined;
}
export type ActionCreators = {
  updateAddedDevWorkspaces: (workspace: devfileApi.DevWorkspace[]) => AppThunk<KnownAction, void>;
  updateDeletedDevWorkspaces: (deletedWorkspacesIds: string[]) => AppThunk<KnownAction, void>;
  updateDevWorkspaceStatus: (message: IStatusUpdate) => AppThunk<KnownAction, void>;
  requestWorkspaces: () => AppThunk<KnownAction, Promise<void>>;
  requestWorkspace: (workspace: devfileApi.DevWorkspace) => AppThunk<KnownAction, Promise<void>>;
  startWorkspace: (workspace: devfileApi.DevWorkspace) => AppThunk<KnownAction, Promise<void>>;
  restartWorkspace: (workspace: devfileApi.DevWorkspace) => AppThunk<KnownAction, Promise<void>>;
  stopWorkspace: (workspace: devfileApi.DevWorkspace) => AppThunk<KnownAction, Promise<void>>;
  terminateWorkspace: (workspace: devfileApi.DevWorkspace) => AppThunk<KnownAction, Promise<void>>;
  updateWorkspace: (workspace: devfileApi.DevWorkspace) => AppThunk<KnownAction, Promise<void>>;
  createWorkspaceFromDevfile: (devfile: devfileApi.Devfile, optionalFilesContent: {
    [fileName: string]: string
  },
    pluginRegistryUrl: string | undefined,
    pluginRegistryInternalUrl: string | undefined,
  ) => AppThunk<KnownAction, Promise<devfileApi.DevWorkspace>>;

  deleteWorkspaceLogs: (workspaceId: string) => AppThunk<DeleteWorkspaceLogsAction, void>;
};

export const actionCreators: ActionCreators = {

  updateAddedDevWorkspaces: (workspaces: devfileApi.DevWorkspace[]): AppThunk<KnownAction, void> => (dispatch): void => {
    workspaces.forEach(workspace => {
      dispatch({
        type: 'ADD_DEVWORKSPACE',
        workspace,
      });
    });
  },

  updateDeletedDevWorkspaces: (deletedWorkspacesIds: string[]): AppThunk<KnownAction, void> => (dispatch): void => {
    deletedWorkspacesIds.forEach(workspaceId => {
      dispatch({
        type: 'DELETE_DEVWORKSPACE',
        workspaceId,
      });
    });
  },

  updateDevWorkspaceStatus: (message: IStatusUpdate): AppThunk<KnownAction, void> => (dispatch): void => {
    onStatusUpdateReceived(dispatch, message);
  },

  requestWorkspaces: (): AppThunk<KnownAction, Promise<void>> => async (dispatch): Promise<void> => {
    dispatch({ type: 'REQUEST_DEVWORKSPACE' });

    try {
      const defaultNamespace = await cheWorkspaceClient.getDefaultNamespace();
      const { workspaces, resourceVersion } = await devWorkspaceClient.getAllWorkspaces(defaultNamespace);

      dispatch({
        type: 'RECEIVE_DEVWORKSPACE',
        workspaces,
        resourceVersion,
      });
    } catch (e) {
      const errorMessage = 'Failed to fetch available workspaces, reason: ' + common.helpers.errors.getMessage(e);
      dispatch({
        type: 'RECEIVE_DEVWORKSPACE_ERROR',
        error: errorMessage,
      });
      throw errorMessage;
    }

  },

  requestWorkspace: (workspace: devfileApi.DevWorkspace): AppThunk<KnownAction, Promise<void>> => async (dispatch): Promise<void> => {
    dispatch({ type: 'REQUEST_DEVWORKSPACE' });

    try {
      const namespace = workspace.metadata.namespace;
      const name = workspace.metadata.name;
      const update = await devWorkspaceClient.getWorkspaceByName(namespace, name);
      dispatch({
        type: 'UPDATE_DEVWORKSPACE',
        workspace: update,
      });
    } catch (e) {
      const errorMessage = `Failed to fetch the workspace ${workspace.metadata.name}, reason: ` + common.helpers.errors.getMessage(e);
      dispatch({
        type: 'RECEIVE_DEVWORKSPACE_ERROR',
        error: errorMessage,
      });
      throw errorMessage;
    }
  },

  startWorkspace: (workspace: devfileApi.DevWorkspace): AppThunk<KnownAction, Promise<void>> => async (dispatch, getState): Promise<void> => {
    dispatch({ type: 'REQUEST_DEVWORKSPACE' });
    try {
      let updatedWorkspace: devfileApi.DevWorkspace;
      if (workspace.metadata.annotations && workspace.metadata.annotations[DEVWORKSPACE_NEXT_START_ANNOTATION]) {
        // If the workspace has DEVWORKSPACE_NEXT_START_ANNOTATION then update the devworkspace with the DEVWORKSPACE_NEXT_START_ANNOTATION annotation value and then start the devworkspace
        const state = getState();
        const plugins = selectDwPluginsList(state);

        const storedDevWorkspace = JSON.parse(workspace.metadata.annotations[DEVWORKSPACE_NEXT_START_ANNOTATION]) as unknown;
        if (!isDevWorkspace(storedDevWorkspace)) {
          console.error(`The stored devworkspace either has wrong "kind" (not ${devWorkspaceKind}) or lacks some of mandatory fields: `, storedDevWorkspace);
          throw new Error('Unexpected error happened. Please check the Console tab of Developer tools.');
        }

        delete workspace.metadata.annotations[DEVWORKSPACE_NEXT_START_ANNOTATION];
        workspace.spec.template = storedDevWorkspace.spec.template;
        workspace.spec.started = true;
        updatedWorkspace = await devWorkspaceClient.update(workspace, plugins);
      } else {
        updatedWorkspace = await devWorkspaceClient.changeWorkspaceStatus(workspace.metadata.namespace, workspace.metadata.name, true);
      }
      dispatch({
        type: 'UPDATE_DEVWORKSPACE',
        workspace: updatedWorkspace,
      });
    } catch (e) {
      const errorMessage = `Failed to start the workspace ${workspace.metadata.name}, reason: ` + common.helpers.errors.getMessage(e);
      dispatch({
        type: 'RECEIVE_DEVWORKSPACE_ERROR',
        error: errorMessage,
      });
      throw errorMessage;
    }
  },

  restartWorkspace: (workspace: devfileApi.DevWorkspace): AppThunk<KnownAction, Promise<void>> => async (dispatch): Promise<void> => {
    const defer: IDeferred<void> = getDefer();
    const toDispose = new DisposableCollection();
    const onStatusChangeCallback = status => {
      if (status === DevWorkspaceStatus.STOPPED || status === DevWorkspaceStatus.FAILED) {
        toDispose.dispose();
        dispatch(actionCreators.startWorkspace(workspace)).then(() => {
          defer.resolve();
        }).catch(e => {
          defer.reject(`Failed to restart the workspace ${workspace.metadata.name}. ${e}`);
        });
      }
    };
    if (workspace.status?.phase === DevWorkspaceStatus.STOPPED || workspace.status?.phase === DevWorkspaceStatus.FAILED) {
      onStatusChangeCallback(workspace.status.phase);
    } else {
      const workspaceId = getId(workspace);
      onStatusChangeCallbacks.set(workspaceId, onStatusChangeCallback);
      toDispose.push({
        dispose: () => onStatusChangeCallbacks.delete(workspaceId)
      });
      if (workspace.status?.phase === DevWorkspaceStatus.RUNNING || workspace.status?.phase === DevWorkspaceStatus.STARTING) {
        try {
          await dispatch(actionCreators.stopWorkspace(workspace));
        } catch (e) {
          defer.reject(`Failed to restart the workspace ${workspace.metadata.name}. ${e}`);
        }
      }
    }

    return defer.promise;
  },

  stopWorkspace: (workspace: devfileApi.DevWorkspace): AppThunk<KnownAction, Promise<void>> => async (dispatch): Promise<void> => {
    try {
      devWorkspaceClient.changeWorkspaceStatus(workspace.metadata.namespace, workspace.metadata.name, false);
      dispatch({ type: 'DELETE_DEVWORKSPACE_LOGS', workspaceId: getId(workspace) });
    } catch (e) {
      const errorMessage = `Failed to stop the workspace ${workspace.metadata.name}, reason: ` + common.helpers.errors.getMessage(e);
      dispatch({
        type: 'RECEIVE_DEVWORKSPACE_ERROR',
        error: errorMessage,
      });
      throw errorMessage;
    }
  },

  terminateWorkspace: (workspace: devfileApi.DevWorkspace): AppThunk<KnownAction, Promise<void>> => async (dispatch): Promise<void> => {
    try {
      const namespace = workspace.metadata.namespace;
      const name = workspace.metadata.name;
      await devWorkspaceClient.delete(namespace, name);
      const workspaceId = getId(workspace);
      dispatch({
        type: 'TERMINATE_DEVWORKSPACE',
        workspaceId,
      });
      dispatch({ type: 'DELETE_DEVWORKSPACE_LOGS', workspaceId });
    } catch (e) {
      const resMessage = `Failed to delete the workspace ${workspace.metadata.name}, reason: ` + common.helpers.errors.getMessage(e);
      dispatch({
        type: 'RECEIVE_DEVWORKSPACE_ERROR',
        error: resMessage,
      });

      throw resMessage;
    }
  },

  updateWorkspace: (workspace: devfileApi.DevWorkspace): AppThunk<KnownAction, Promise<void>> => async (dispatch, getState): Promise<void> => {
    dispatch({ type: 'REQUEST_DEVWORKSPACE' });

    try {
      const state = getState();
      const plugins = selectDwPluginsList(state);
      const updated = await devWorkspaceClient.update(workspace, plugins);
      dispatch({
        type: 'UPDATE_DEVWORKSPACE',
        workspace: updated,
      });
    } catch (e) {
      const errorMessage = `Failed to update the workspace ${workspace.metadata.name}, reason: ` + common.helpers.errors.getMessage(e);
      dispatch({
        type: 'RECEIVE_DEVWORKSPACE_ERROR',
        error: errorMessage,
      });
      throw errorMessage;
    }
  },

  createWorkspaceFromDevfile: (devfile: devfileApi.Devfile, optionalFilesContent: {
    [fileName: string]: string
  },
    pluginRegistryUrl: string | undefined,
    pluginRegistryInternalUrl: string | undefined,
  ): AppThunk<KnownAction, Promise<devfileApi.DevWorkspace>> => async (dispatch, getState): Promise<devfileApi.DevWorkspace> => {

    const state = getState();

    if (state.dwPlugins.defaultEditorError) {
      const message = `Required sources failed when trying to create the workspace: ${state.dwPlugins.defaultEditorError}`;
      throw message;
    }

    dispatch({ type: 'REQUEST_DEVWORKSPACE' });
    try {
      // If the devworkspace doesn't have a namespace then we assign it to the default kubernetesNamespace
      const devWorkspaceDevfile = devfile as devfileApi.Devfile;
      const defaultNamespace = await cheWorkspaceClient.getDefaultNamespace();
      const dwPlugins = selectDwPluginsList(state);
      const workspace = await devWorkspaceClient.create(devWorkspaceDevfile, defaultNamespace, dwPlugins, pluginRegistryUrl, pluginRegistryInternalUrl, optionalFilesContent);

      dispatch({
        type: 'ADD_DEVWORKSPACE',
        workspace,
      });
      return workspace;
    } catch (e) {
      const errorMessage = 'Failed to create a new workspace from the devfile, reason: ' + common.helpers.errors.getMessage(e);
      dispatch({
        type: 'RECEIVE_DEVWORKSPACE_ERROR',
        error: errorMessage,
      });
      throw errorMessage;
    }
  },

  deleteWorkspaceLogs: (workspaceId: string): AppThunk<DeleteWorkspaceLogsAction, void> => (dispatch): void => {
    dispatch({ type: 'DELETE_DEVWORKSPACE_LOGS', workspaceId });
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
    case 'REQUEST_DEVWORKSPACE':
      return createObject(state, {
        isLoading: true,
        error: undefined,
      });
    case 'RECEIVE_DEVWORKSPACE':
      return createObject(state, {
        isLoading: false,
        workspaces: action.workspaces,
        resourceVersion: action.resourceVersion,
      });
    case 'RECEIVE_DEVWORKSPACE_ERROR':
      return createObject(state, {
        isLoading: false,
        error: action.error,
      });
    case 'UPDATE_DEVWORKSPACE':
      return createObject(state, {
        isLoading: false,
        workspaces: state.workspaces.map(workspace => getId(workspace) === getId(action.workspace) ? action.workspace : workspace),
      });
    case 'UPDATE_DEVWORKSPACE_STATUS':
      return createObject(state, {
        workspaces: state.workspaces.map(workspace => {
          if (getId(workspace) === action.workspaceId) {
            if (!workspace.status) {
              workspace.status = {} as devfileApi.DevWorkspaceStatus;
            }
            workspace.status.phase = action.status;
          }
          return workspace;
        }),
      });
    case 'ADD_DEVWORKSPACE':
      return createObject(state, {
        workspaces: state.workspaces
          .filter(workspace => getId(workspace) !== getId(action.workspace))
          .concat([action.workspace]),
      });
    case 'TERMINATE_DEVWORKSPACE':
      return createObject(state, {
        isLoading: false,
        workspaces: state.workspaces.map(workspace => {
          if (getId(workspace) === action.workspaceId) {
            const targetWorkspace = Object.assign({}, workspace);
            if (!targetWorkspace.status) {
              targetWorkspace.status = {} as devfileApi.DevWorkspaceStatus;
            }
            targetWorkspace.status.phase = DevWorkspaceStatus.TERMINATING;
            return targetWorkspace;
          }
          return workspace;
        }),
      });
    case 'DELETE_DEVWORKSPACE':
      return createObject(state, {
        workspaces: state.workspaces.filter(workspace => getId(workspace) !== action.workspaceId),
      });
    case 'UPDATE_DEVWORKSPACE_LOGS':
      return createObject(state, {
        workspacesLogs: mergeLogs(state.workspacesLogs, action.workspacesLogs),
      });
    case 'DELETE_DEVWORKSPACE_LOGS':
      return createObject(state, {
        workspacesLogs: deleteLogs(state.workspacesLogs, action.workspaceId),
      });
    default:
      return state;
  }

};

async function onStatusUpdateReceived(
  dispatch: ThunkDispatch<State, undefined, KnownAction>,
  statusUpdate: IStatusUpdate) {
  let status: string | undefined;
  if (statusUpdate.error) {
    const workspacesLogs = new Map<string, string[]>();
    workspacesLogs.set(statusUpdate.workspaceId, [`Error: Failed to run the workspace: "${statusUpdate.error}"`]);
    dispatch({
      type: 'UPDATE_DEVWORKSPACE_LOGS',
      workspacesLogs,
    });
    status = DevWorkspaceStatus.FAILED;
  } else {
    if (statusUpdate.message) {
      const workspacesLogs = new Map<string, string[]>();

      /**
       * Don't add in messages with no workspaces id or with stopped or stopping messages. The stopped and stopping messages
       * only appear because we initially create a stopped devworkspace, add in devworkspace templates, and then start the devworkspace
       */
      if (statusUpdate.workspaceId !== '' && statusUpdate.status !== DevWorkspaceStatus.STOPPED && statusUpdate.status !== DevWorkspaceStatus.STOPPING) {
        workspacesLogs.set(statusUpdate.workspaceId, [statusUpdate.message]);
        dispatch({
          type: 'UPDATE_DEVWORKSPACE_LOGS',
          workspacesLogs,
        });
      }
    }
    status = statusUpdate.status;
    const callback = onStatusChangeCallbacks.get(statusUpdate.workspaceId);
    if (callback && status) {
      callback(status);
    }
  }
  if (status && status !== devWorkspaceStatusMap.get(statusUpdate.workspaceId)) {
    devWorkspaceStatusMap.set(statusUpdate.workspaceId, status);
    dispatch({
      type: 'UPDATE_DEVWORKSPACE_STATUS',
      workspaceId: statusUpdate.workspaceId,
      status,
    });
  }
}
