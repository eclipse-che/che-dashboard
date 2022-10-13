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
import { AppState, AppThunk } from '../..';
import { container } from '../../../inversify.config';
import { DevWorkspaceStatus, WorkspacesLogs } from '../../../services/helpers/types';
import { createObject } from '../../helpers';
import {
  DevWorkspaceClient,
  DEVWORKSPACE_NEXT_START_ANNOTATION,
  IStatusUpdate,
} from '../../../services/workspace-client/devworkspace/devWorkspaceClient';
import devfileApi, { isDevWorkspace } from '../../../services/devfileApi';
import { deleteLogs, mergeLogs } from '../logs';
import { getDefer, IDeferred } from '../../../services/helpers/deferred';
import { DisposableCollection } from '../../../services/helpers/disposable';
import { selectDwEditorsPluginsList } from '../../Plugins/devWorkspacePlugins/selectors';
import { devWorkspaceKind } from '../../../services/devfileApi/devWorkspace';
import { WorkspaceAdapter } from '../../../services/workspace-adapter';
import {
  DEVWORKSPACE_CHE_EDITOR,
  DEVWORKSPACE_UPDATING_TIMESTAMP_ANNOTATION,
} from '../../../services/devfileApi/devWorkspace/metadata';
import * as DwPluginsStore from '../../Plugins/devWorkspacePlugins';
import { selectDefaultNamespace } from '../../InfrastructureNamespaces/selectors';
import { injectKubeConfig } from '../../../services/dashboard-backend-client/devWorkspaceApi';
import { selectRunningWorkspacesLimit } from '../../ClusterConfig/selectors';
import { cloneDeep } from 'lodash';
import { delay } from '../../../services/helpers/delay';
import { selectOpenVSXUrl } from '../../ServerConfig/selectors';
import { selectRunningDevWorkspacesLimitExceeded } from './selectors';
import * as DwServerConfigStore from '../../ServerConfig';

const devWorkspaceClient = container.get(DevWorkspaceClient);

export const onStatusChangeCallbacks = new Map<string, (status: DevWorkspaceStatus) => void>();

export interface State {
  isLoading: boolean;
  workspaces: devfileApi.DevWorkspace[];
  resourceVersion?: string;
  error?: string;
  // runtime logs
  workspacesLogs: WorkspacesLogs;
}

export class RunningWorkspacesExceededError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RunningWorkspacesExceededError';
  }
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
  workspaceUID: string;
  status: string;
  message: string;
  mainUrl?: string;
  started: boolean;
}

interface UpdateWorkspacesLogsAction extends Action {
  type: 'UPDATE_DEVWORKSPACE_LOGS';
  workspacesLogs: WorkspacesLogs;
}

interface DeleteWorkspaceLogsAction extends Action {
  type: 'DELETE_DEVWORKSPACE_LOGS';
  workspaceUID: string;
}

interface DeleteWorkspaceAction extends Action {
  type: 'DELETE_DEVWORKSPACE';
  workspaceId: string;
}

interface TerminateWorkspaceAction extends Action {
  type: 'TERMINATE_DEVWORKSPACE';
  workspaceUID: string;
  message: string;
}

interface AddWorkspaceAction extends Action {
  type: 'ADD_DEVWORKSPACE';
  workspace: devfileApi.DevWorkspace;
}

type KnownAction =
  | RequestDevWorkspacesAction
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
};
export type ActionCreators = {
  updateAddedDevWorkspaces: (workspace: devfileApi.DevWorkspace[]) => AppThunk<KnownAction>;
  updateDeletedDevWorkspaces: (deletedWorkspacesIds: string[]) => AppThunk<KnownAction>;
  updateDevWorkspaceStatus: (message: IStatusUpdate) => AppThunk<KnownAction, Promise<void>>;
  requestWorkspaces: () => AppThunk<KnownAction, Promise<void>>;
  requestWorkspace: (workspace: devfileApi.DevWorkspace) => AppThunk<KnownAction, Promise<void>>;
  startWorkspace: (
    workspace: devfileApi.DevWorkspace,
    debugWorkspace?: boolean,
  ) => AppThunk<KnownAction, Promise<void>>;
  restartWorkspace: (workspace: devfileApi.DevWorkspace) => AppThunk<KnownAction, Promise<void>>;
  stopWorkspace: (workspace: devfileApi.DevWorkspace) => AppThunk<KnownAction, Promise<void>>;
  terminateWorkspace: (workspace: devfileApi.DevWorkspace) => AppThunk<KnownAction, Promise<void>>;
  updateWorkspaceAnnotation: (
    workspace: devfileApi.DevWorkspace,
  ) => AppThunk<KnownAction, Promise<void>>;
  updateWorkspace: (workspace: devfileApi.DevWorkspace) => AppThunk<KnownAction, Promise<void>>;
  createWorkspaceFromDevfile: (
    devfile: devfileApi.Devfile,
    optionalFilesContent: {
      [fileName: string]: string;
    },
    pluginRegistryUrl: string | undefined,
    pluginRegistryInternalUrl: string | undefined,
    attributes: { [key: string]: string },
  ) => AppThunk<KnownAction, Promise<void>>;
  createWorkspaceFromResources: (
    devworkspace: devfileApi.DevWorkspace,
    devworkspaceTemplate: devfileApi.DevWorkspaceTemplate,
    editor?: string,
  ) => AppThunk<KnownAction, Promise<void>>;

  deleteWorkspaceLogs: (workspaceUID: string) => AppThunk<DeleteWorkspaceLogsAction, void>;
};
export const actionCreators: ActionCreators = {
  updateAddedDevWorkspaces:
    (workspaces: devfileApi.DevWorkspace[]): AppThunk<KnownAction, void> =>
    (dispatch): void => {
      workspaces.forEach(workspace => {
        dispatch({
          type: 'ADD_DEVWORKSPACE',
          workspace,
        });
      });
    },

  updateDeletedDevWorkspaces:
    (deletedWorkspacesIds: string[]): AppThunk<KnownAction> =>
    (dispatch): void => {
      deletedWorkspacesIds.forEach(workspaceId => {
        dispatch({
          type: 'DELETE_DEVWORKSPACE',
          workspaceId,
        });
      });
    },

  updateDevWorkspaceStatus:
    (
      message: IStatusUpdate & {
        namespace?: string;
        workspaceId?: string;
      },
    ): AppThunk<KnownAction, Promise<void>> =>
    async (dispatch, getState): Promise<void> => {
      if (!message.namespace || !message.workspaceId) {
        const {
          devWorkspaces: { workspaces },
        } = getState();
        const workspace = workspaces.find(w => w.metadata.uid === message.workspaceUID);
        if (workspace) {
          message.namespace = workspace?.metadata?.namespace;
          message.workspaceId = workspace.status?.devworkspaceId;
        }
      }
      await onStatusUpdateReceived(dispatch, message);
    },

  requestWorkspaces:
    (): AppThunk<KnownAction, Promise<void>> =>
    async (dispatch, getState): Promise<void> => {
      dispatch({ type: 'REQUEST_DEVWORKSPACE' });

      try {
        const defaultKubernetesNamespace = selectDefaultNamespace(getState());
        const defaultNamespace = defaultKubernetesNamespace.name;
        const { workspaces, resourceVersion } = defaultNamespace
          ? await devWorkspaceClient.getAllWorkspaces(defaultNamespace)
          : {
              workspaces: [],
              resourceVersion: '',
            };

        dispatch({
          type: 'RECEIVE_DEVWORKSPACE',
          workspaces,
          resourceVersion,
        });

        const promises = workspaces
          .filter(
            workspace =>
              workspace.metadata.annotations?.[DEVWORKSPACE_UPDATING_TIMESTAMP_ANNOTATION] ===
              undefined,
          )
          .map(async workspace => {
            // this will set updating timestamp to annotations and update the workspace
            await actionCreators.updateWorkspace(workspace)(dispatch, getState, undefined);
          });
        await Promise.allSettled(promises);
      } catch (e) {
        const errorMessage =
          'Failed to fetch available workspaces, reason: ' + common.helpers.errors.getMessage(e);
        dispatch({
          type: 'RECEIVE_DEVWORKSPACE_ERROR',
          error: errorMessage,
        });
        throw errorMessage;
      }
    },

  requestWorkspace:
    (workspace: devfileApi.DevWorkspace): AppThunk<KnownAction, Promise<void>> =>
    async (dispatch, getState): Promise<void> => {
      dispatch({ type: 'REQUEST_DEVWORKSPACE' });

      try {
        const namespace = workspace.metadata.namespace;
        const name = workspace.metadata.name;
        const update = await devWorkspaceClient.getWorkspaceByName(namespace, name);
        dispatch({
          type: 'UPDATE_DEVWORKSPACE',
          workspace: update,
        });

        if (
          update.metadata.annotations?.[DEVWORKSPACE_UPDATING_TIMESTAMP_ANNOTATION] === undefined
        ) {
          // this will set updating timestamp to annotations and update the workspace
          await actionCreators.updateWorkspace(update)(dispatch, getState, undefined);
        }
      } catch (e) {
        const errorMessage =
          `Failed to fetch the workspace ${workspace.metadata.name}, reason: ` +
          common.helpers.errors.getMessage(e);
        dispatch({
          type: 'RECEIVE_DEVWORKSPACE_ERROR',
          error: errorMessage,
        });
        throw errorMessage;
      }
    },

  startWorkspace:
    (
      _workspace: devfileApi.DevWorkspace,
      debugWorkspace = false,
    ): AppThunk<KnownAction, Promise<void>> =>
    async (dispatch, getState): Promise<void> => {
      const workspace = getState().devWorkspaces.workspaces.find(
        w => w.metadata.uid === _workspace.metadata.uid,
      );
      if (workspace === undefined) {
        console.warn(`Can't find the target workspace ${_workspace.metadata.name}`);
        return;
      }
      if (workspace.spec.started) {
        console.warn(`Workspace ${_workspace.metadata.name} already started`);
        return;
      }
      dispatch({ type: 'REQUEST_DEVWORKSPACE' });
      try {
        checkRunningWorkspacesLimit(getState());
        await dispatch(DwServerConfigStore.actionCreators.requestServerConfig());
        const config = getState().dwServerConfig.config;
        await devWorkspaceClient.updateConfigData(workspace, config);
        await devWorkspaceClient.updateDebugMode(workspace, debugWorkspace);
        let updatedWorkspace: devfileApi.DevWorkspace;
        const workspaceUID = workspace.metadata.uid;
        dispatch({
          type: 'DELETE_DEVWORKSPACE_LOGS',
          workspaceUID,
        });
        if (workspace.metadata.annotations?.[DEVWORKSPACE_NEXT_START_ANNOTATION]) {
          const storedDevWorkspace = JSON.parse(
            workspace.metadata.annotations[DEVWORKSPACE_NEXT_START_ANNOTATION],
          ) as unknown;
          if (!isDevWorkspace(storedDevWorkspace)) {
            console.error(
              `The stored devworkspace either has wrong "kind" (not ${devWorkspaceKind}) or lacks some of mandatory fields: `,
              storedDevWorkspace,
            );
            throw new Error(
              'Unexpected error happened. Please check the Console tab of Developer tools.',
            );
          }

          delete workspace.metadata.annotations[DEVWORKSPACE_NEXT_START_ANNOTATION];
          workspace.spec.template = storedDevWorkspace.spec.template;
          workspace.spec.started = true;
          updatedWorkspace = await devWorkspaceClient.update(workspace);
        } else {
          updatedWorkspace = await devWorkspaceClient.changeWorkspaceStatus(workspace, true, true);
        }

        const editor = updatedWorkspace.metadata.annotations
          ? updatedWorkspace.metadata.annotations[DEVWORKSPACE_CHE_EDITOR]
          : undefined;
        const defaultPlugins = getState().dwPlugins.defaultPlugins;
        await devWorkspaceClient.onStart(updatedWorkspace, defaultPlugins, editor);
        dispatch({
          type: 'UPDATE_DEVWORKSPACE',
          workspace: updatedWorkspace,
        });

        // sometimes workspace don't have enough time to change its status.
        // wait for status to become STARTING or 10 seconds, whichever comes first
        const defer: IDeferred<void> = getDefer();
        const toDispose = new DisposableCollection();
        const statusStartingHandler = async (status: DevWorkspaceStatus) => {
          if (status === DevWorkspaceStatus.STARTING) {
            defer.resolve();
          }
        };
        onStatusChangeCallbacks.set(workspaceUID, statusStartingHandler);
        toDispose.push({
          dispose: () => onStatusChangeCallbacks.delete(workspaceUID),
        });
        const startingTimeout = 10000;
        await Promise.race([defer.promise, delay(startingTimeout)]);
        toDispose.dispose();

        devWorkspaceClient.checkForDevWorkspaceError(updatedWorkspace);
      } catch (e) {
        const errorMessage =
          `Failed to start the workspace ${workspace.metadata.name}, reason: ` +
          common.helpers.errors.getMessage(e);
        dispatch({
          type: 'RECEIVE_DEVWORKSPACE_ERROR',
          error: errorMessage,
        });

        if (common.helpers.errors.isError(e)) {
          throw e;
        }
        throw new Error(errorMessage);
      }
    },

  restartWorkspace:
    (workspace: devfileApi.DevWorkspace): AppThunk<KnownAction, Promise<void>> =>
    async (dispatch): Promise<void> => {
      const defer: IDeferred<void> = getDefer();
      const toDispose = new DisposableCollection();
      const onStatusChangeCallback = async (status: DevWorkspaceStatus) => {
        if (status === DevWorkspaceStatus.STOPPED || status === DevWorkspaceStatus.FAILED) {
          toDispose.dispose();
          try {
            await dispatch(actionCreators.startWorkspace(workspace));
            defer.resolve();
          } catch (e) {
            defer.reject(`Failed to restart the workspace ${workspace.metadata.name}. ${e}`);
          }
        }
      };
      if (
        workspace.status?.phase === DevWorkspaceStatus.STOPPED ||
        workspace.status?.phase === DevWorkspaceStatus.FAILED
      ) {
        await onStatusChangeCallback(workspace.status.phase);
      } else {
        const workspaceUID = WorkspaceAdapter.getUID(workspace);
        onStatusChangeCallbacks.set(workspaceUID, onStatusChangeCallback);
        toDispose.push({
          dispose: () => onStatusChangeCallbacks.delete(workspaceUID),
        });
        if (
          workspace.status?.phase === DevWorkspaceStatus.RUNNING ||
          workspace.status?.phase === DevWorkspaceStatus.STARTING ||
          workspace.status?.phase === DevWorkspaceStatus.FAILING
        ) {
          try {
            await dispatch(actionCreators.stopWorkspace(workspace));
          } catch (e) {
            defer.reject(`Failed to restart the workspace ${workspace.metadata.name}. ${e}`);
          }
        }
      }

      return defer.promise;
    },

  stopWorkspace:
    (workspace: devfileApi.DevWorkspace): AppThunk<KnownAction, Promise<void>> =>
    async (dispatch): Promise<void> => {
      try {
        await devWorkspaceClient.changeWorkspaceStatus(workspace, false);
        dispatch({
          type: 'DELETE_DEVWORKSPACE_LOGS',
          workspaceUID: WorkspaceAdapter.getUID(workspace),
        });
      } catch (e) {
        const errorMessage =
          `Failed to stop the workspace ${workspace.metadata.name}, reason: ` +
          common.helpers.errors.getMessage(e);
        dispatch({
          type: 'RECEIVE_DEVWORKSPACE_ERROR',
          error: errorMessage,
        });
        throw errorMessage;
      }
    },

  terminateWorkspace:
    (workspace: devfileApi.DevWorkspace): AppThunk<KnownAction, Promise<void>> =>
    async (dispatch): Promise<void> => {
      try {
        const namespace = workspace.metadata.namespace;
        const name = workspace.metadata.name;
        await devWorkspaceClient.delete(namespace, name);
        const workspaceUID = WorkspaceAdapter.getUID(workspace);
        dispatch({
          type: 'TERMINATE_DEVWORKSPACE',
          workspaceUID,
          message: workspace.status?.message || 'Cleaning up resources for deletion',
        });
        dispatch({ type: 'DELETE_DEVWORKSPACE_LOGS', workspaceUID });
      } catch (e) {
        const resMessage =
          `Failed to delete the workspace ${workspace.metadata.name}, reason: ` +
          common.helpers.errors.getMessage(e);
        dispatch({
          type: 'RECEIVE_DEVWORKSPACE_ERROR',
          error: resMessage,
        });

        throw resMessage;
      }
    },

  updateWorkspaceAnnotation:
    (workspace: devfileApi.DevWorkspace): AppThunk<KnownAction, Promise<void>> =>
    async (dispatch): Promise<void> => {
      dispatch({ type: 'REQUEST_DEVWORKSPACE' });

      try {
        const updated = await devWorkspaceClient.updateAnnotation(workspace);
        dispatch({
          type: 'UPDATE_DEVWORKSPACE',
          workspace: updated,
        });
      } catch (e) {
        const errorMessage =
          `Failed to update the workspace ${workspace.metadata.name}, reason: ` +
          common.helpers.errors.getMessage(e);
        dispatch({
          type: 'RECEIVE_DEVWORKSPACE_ERROR',
          error: errorMessage,
        });
        throw errorMessage;
      }
    },

  updateWorkspace:
    (workspace: devfileApi.DevWorkspace): AppThunk<KnownAction, Promise<void>> =>
    async (dispatch): Promise<void> => {
      dispatch({ type: 'REQUEST_DEVWORKSPACE' });

      try {
        const updated = await devWorkspaceClient.update(workspace);
        dispatch({
          type: 'UPDATE_DEVWORKSPACE',
          workspace: updated,
        });
      } catch (e) {
        const errorMessage =
          `Failed to update the workspace ${workspace.metadata.name}, reason: ` +
          common.helpers.errors.getMessage(e);
        dispatch({
          type: 'RECEIVE_DEVWORKSPACE_ERROR',
          error: errorMessage,
        });
        throw errorMessage;
      }
    },

  createWorkspaceFromResources:
    (
      devworkspace: devfileApi.DevWorkspace,
      devworkspaceTemplate: devfileApi.DevWorkspaceTemplate,
      editorId?: string,
    ): AppThunk<KnownAction, Promise<void>> =>
    async (dispatch, getState): Promise<void> => {
      const state = getState();
      const defaultKubernetesNamespace = selectDefaultNamespace(state);
      const openVSXUrl = selectOpenVSXUrl(state);
      const defaultNamespace = defaultKubernetesNamespace.name;
      try {
        const cheEditor = editorId ? editorId : state.dwPlugins.defaultEditorName;
        const pluginRegistryUrl =
          state.workspacesSettings.settings['cheWorkspacePluginRegistryUrl'];
        const pluginRegistryInternalUrl =
          state.workspacesSettings.settings['cheWorkspacePluginRegistryInternalUrl'];
        const workspace = await devWorkspaceClient.createFromResources(
          defaultNamespace,
          devworkspace,
          devworkspaceTemplate,
          cheEditor,
          pluginRegistryUrl,
          pluginRegistryInternalUrl,
          openVSXUrl,
        );

        if (workspace.spec.started) {
          const editor = workspace.metadata.annotations
            ? workspace.metadata.annotations[DEVWORKSPACE_CHE_EDITOR]
            : undefined;
          const defaultPlugins = getState().dwPlugins.defaultPlugins;
          await devWorkspaceClient.onStart(workspace, defaultPlugins, editor);
        }
        dispatch({
          type: 'ADD_DEVWORKSPACE',
          workspace,
        });
      } catch (e) {
        const errorMessage =
          'Failed to create a new workspace, reason: ' + common.helpers.errors.getMessage(e);
        dispatch({
          type: 'RECEIVE_DEVWORKSPACE_ERROR',
          error: errorMessage,
        });
        throw errorMessage;
      }
    },

  createWorkspaceFromDevfile:
    (
      devfile: devfileApi.Devfile,
      optionalFilesContent: {
        [fileName: string]: string;
      },
      pluginRegistryUrl: string | undefined,
      pluginRegistryInternalUrl: string | undefined,
      attributes: { [key: string]: string },
    ): AppThunk<KnownAction, Promise<void>> =>
    async (dispatch, getState): Promise<void> => {
      let state = getState();

      // do we have an optional editor parameter ?
      let cheEditor: string | undefined = attributes?.['che-editor'];
      if (cheEditor) {
        // if the editor is different than the current default one, need to load a specific one
        if (cheEditor !== state.dwPlugins.defaultEditorName) {
          console.log(
            `User specified a different editor than the current default. Loading ${cheEditor} definition instead of ${state.dwPlugins.defaultEditorName}.`,
          );
          await dispatch(
            DwPluginsStore.actionCreators.requestDwEditor(
              state.workspacesSettings.settings,
              cheEditor,
            ),
          );
        }
      } else {
        // take the default editor name
        console.log(`Using default editor ${state.dwPlugins.defaultEditorName}`);
        cheEditor = state.dwPlugins.defaultEditorName;
      }

      if (state.dwPlugins.defaultEditorError) {
        throw `Required sources failed when trying to create the workspace: ${state.dwPlugins.defaultEditorError}`;
      }

      // refresh state
      state = getState();
      dispatch({ type: 'REQUEST_DEVWORKSPACE' });
      try {
        // If the devworkspace doesn't have a namespace then we assign it to the default kubernetesNamespace
        const devWorkspaceDevfile = devfile as devfileApi.Devfile;
        const defaultNamespace = selectDefaultNamespace(state);
        const openVSXURL = selectOpenVSXUrl(state);
        const dwEditorsList = selectDwEditorsPluginsList(cheEditor)(state);
        const workspace = await devWorkspaceClient.createFromDevfile(
          devWorkspaceDevfile,
          defaultNamespace.name,
          dwEditorsList,
          pluginRegistryUrl,
          pluginRegistryInternalUrl,
          openVSXURL,
          cheEditor,
          optionalFilesContent,
        );
        if (workspace.spec.started) {
          const defaultPlugins = getState().dwPlugins.defaultPlugins;
          await devWorkspaceClient.onStart(workspace, defaultPlugins, cheEditor as string);
        }
        dispatch({
          type: 'ADD_DEVWORKSPACE',
          workspace,
        });
      } catch (e) {
        const errorMessage =
          'Failed to create a new workspace from the devfile, reason: ' +
          common.helpers.errors.getMessage(e);
        dispatch({
          type: 'RECEIVE_DEVWORKSPACE_ERROR',
          error: errorMessage,
        });
        throw errorMessage;
      }
    },

  deleteWorkspaceLogs:
    (workspaceUID: string): AppThunk<DeleteWorkspaceLogsAction, void> =>
    (dispatch): void => {
      dispatch({ type: 'DELETE_DEVWORKSPACE_LOGS', workspaceUID });
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
        workspaces: state.workspaces.map(workspace =>
          WorkspaceAdapter.getUID(workspace) === WorkspaceAdapter.getUID(action.workspace)
            ? action.workspace
            : workspace,
        ),
      });
    case 'UPDATE_DEVWORKSPACE_STATUS':
      return createObject(state, {
        workspaces: state.workspaces.map(workspace => {
          if (WorkspaceAdapter.getUID(workspace) !== action.workspaceUID) {
            return workspace;
          }
          const nextWorkspace = cloneDeep(workspace);
          if (!nextWorkspace.status) {
            nextWorkspace.status = {} as devfileApi.DevWorkspaceStatus;
          }
          nextWorkspace.status.phase = action.status;
          nextWorkspace.status.message = action.message;
          nextWorkspace.status.mainUrl = action.mainUrl;
          nextWorkspace.spec.started = action.started;
          return nextWorkspace;
        }),
      });
    case 'ADD_DEVWORKSPACE':
      return createObject(state, {
        isLoading: false,
        workspaces: state.workspaces
          .filter(
            workspace =>
              WorkspaceAdapter.getUID(workspace) !== WorkspaceAdapter.getUID(action.workspace),
          )
          .concat([action.workspace]),
      });
    case 'TERMINATE_DEVWORKSPACE':
      return createObject(state, {
        isLoading: false,
        workspaces: state.workspaces.map(workspace => {
          if (WorkspaceAdapter.getUID(workspace) === action.workspaceUID) {
            const targetWorkspace = Object.assign({}, workspace);
            if (!targetWorkspace.status) {
              targetWorkspace.status = {} as devfileApi.DevWorkspaceStatus;
            }
            targetWorkspace.status.phase = DevWorkspaceStatus.TERMINATING;
            targetWorkspace.status.message = action.message;
            return targetWorkspace;
          }
          return workspace;
        }),
      });
    case 'DELETE_DEVWORKSPACE':
      return createObject(state, {
        workspaces: state.workspaces.filter(
          workspace => WorkspaceAdapter.getId(workspace) !== action.workspaceId,
        ),
      });
    case 'UPDATE_DEVWORKSPACE_LOGS':
      return createObject(state, {
        workspacesLogs: mergeLogs(state.workspacesLogs, action.workspacesLogs),
      });
    case 'DELETE_DEVWORKSPACE_LOGS':
      return createObject(state, {
        workspacesLogs: deleteLogs(state.workspacesLogs, action.workspaceUID),
      });
    default:
      return state;
  }
};

export function checkRunningWorkspacesLimit(state: AppState) {
  const runningLimitExceeded = selectRunningDevWorkspacesLimitExceeded(state);
  if (runningLimitExceeded === false) {
    return;
  }

  const runningLimit = selectRunningWorkspacesLimit(state);
  throwRunningWorkspacesExceededError(runningLimit);
}

export function throwRunningWorkspacesExceededError(runningLimit: number): never {
  const message = `You can only have ${runningLimit} running workspace${
    runningLimit > 1 ? 's' : ''
  } at a time.`;
  throw new RunningWorkspacesExceededError(message);
}

async function onStatusUpdateReceived(
  dispatch: ThunkDispatch<AppState, unknown, KnownAction>,
  statusUpdate: IStatusUpdate,
) {
  const { status, message, prevStatus, workspaceUID, namespace, workspaceId, mainUrl, started } =
    statusUpdate;

  if (status !== prevStatus) {
    const type = 'UPDATE_DEVWORKSPACE_STATUS';
    dispatch({ type, workspaceUID, message, status, mainUrl, started });

    const onChangeCallback = onStatusChangeCallbacks.get(workspaceUID);
    if (onChangeCallback) {
      onChangeCallback(status);
    }
  }

  if (message && status !== DevWorkspaceStatus.STOPPED) {
    let log: string;
    if (status === DevWorkspaceStatus.FAILED || status === DevWorkspaceStatus.FAILING) {
      log = `1 error occurred: ${message}`;
    } else {
      log = message;
    }

    dispatch({
      type: 'UPDATE_DEVWORKSPACE_LOGS',
      workspacesLogs: new Map([[workspaceUID, [log]]]),
    });
  }

  if (
    status === DevWorkspaceStatus.RUNNING &&
    status !== prevStatus &&
    namespace !== undefined &&
    workspaceId !== undefined
  ) {
    try {
      await injectKubeConfig(namespace, workspaceId);
    } catch (e) {
      console.error(e);
    }
  }
}
