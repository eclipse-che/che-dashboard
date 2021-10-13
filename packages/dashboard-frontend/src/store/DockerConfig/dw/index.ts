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
import { api, helpers } from '@eclipse-che/common';
import { AppThunk } from '../..';
import { createObject } from '../../helpers';
import * as DwApi from '../../../services/dashboard-backend-client/devWorkspaceApi';
import { RegistryRow } from '../types';
import { State } from '../dockerConfigState';
export * from '../dockerConfigState';

interface RequestCredentialsAction extends Action {
  type: 'REQUEST_DEVWORKSPACE_CREDENTIALS';
}

interface SetCredentialsAction extends Action {
  type: 'SET_DEVWORKSPACE_CREDENTIALS';
  registries: RegistryRow[];
  resourceVersion: string | undefined;
}

interface ReceiveErrorAction extends Action {
  type: 'RECEIVE_DEVWORKSPACE_CREDENTIALS_ERROR';
  error: string;
}

type KnownAction = RequestCredentialsAction | SetCredentialsAction | ReceiveErrorAction;

export type ActionCreators = {
  requestCredentials: (namespace: string) => AppThunk<KnownAction, Promise<void>>;
  updateCredentials: (namespace: string, registries: RegistryRow[]) => AppThunk<KnownAction, Promise<void>>;
  deleteCredentials: (namespace: string) => AppThunk<KnownAction, Promise<void>>;
};

export const actionCreators: ActionCreators = {

  requestCredentials: (namespace: string): AppThunk<KnownAction, Promise<void>> => async (dispatch): Promise<void> => {
    dispatch({ type: 'REQUEST_DEVWORKSPACE_CREDENTIALS' });
    try {
      const { registries, resourceVersion } =  await getDockerConfig(namespace);
      dispatch({
        type: 'SET_DEVWORKSPACE_CREDENTIALS',
        registries,
        resourceVersion,
      });
    } catch (e) {
      const errorMessage = 'Failed to request the docker config. Reason: ' + helpers.errors.getMessage(e);
      dispatch({
        type: 'RECEIVE_DEVWORKSPACE_CREDENTIALS_ERROR',
        error: errorMessage
      });
      throw errorMessage;
    }
  },

  updateCredentials: (namespace: string, registries: RegistryRow[]): AppThunk<KnownAction, Promise<void>> => async (dispatch, getState): Promise<void> => {
    dispatch({ type: 'REQUEST_DEVWORKSPACE_CREDENTIALS' });
    const { dwDockerConfig } = getState();
    try {
      const { resourceVersion } = await putDockerConfig(namespace, registries, dwDockerConfig.resourceVersion);
      dispatch({
        type: 'SET_DEVWORKSPACE_CREDENTIALS',
        registries,
        resourceVersion
      });
    } catch (e) {
      const errorMessage = 'Failed to update the docker cofig. Reason: ' + helpers.errors.getMessage(e);
      dispatch({
        type: 'RECEIVE_DEVWORKSPACE_CREDENTIALS_ERROR',
        error: errorMessage
      });
      throw errorMessage;
    }
  },

  deleteCredentials: (namespace: string): AppThunk<Action, Promise<void>> => async (dispatch, getState): Promise<void> => {
    dispatch({ type: 'REQUEST_DEVWORKSPACE_CREDENTIALS' });
    const { dwDockerConfig } = getState();
    const registries = [];
    try {
      const { resourceVersion } = await putDockerConfig(namespace, registries, dwDockerConfig.resourceVersion);
      dispatch({
        type: 'SET_DEVWORKSPACE_CREDENTIALS',
        registries,
        resourceVersion
      });
    } catch (e) {
      const errorMessage = 'Failed to delete the docker cofig. Reason: ' + helpers.errors.getMessage(e);
      dispatch({
        type: 'RECEIVE_DEVWORKSPACE_CREDENTIALS_ERROR',
        error: errorMessage
      });
      throw errorMessage;
    }
  },
};

async function getDockerConfig(namespace: string): Promise<{ registries: RegistryRow[], resourceVersion?: string }> {
  const { dockerconfig, resourceVersion } =  await DwApi.getDockerConfig(namespace);
  const auths = JSON.parse(window.atob(dockerconfig))['auths'];
  const registries: RegistryRow[] = [];
  Object.keys(auths).forEach(key => {
    const [username, password] = window.atob(auths[key]['auth']).split(':');
    registries.push({ url: key, username, password });
  });
  return { registries, resourceVersion };
}

function putDockerConfig(namespace: string, registries: RegistryRow[], resourceVersion?: string ): Promise<api.IDockerConfig> {
  const configObj = {auths: {}};
  registries.forEach(item => {
    const { url, username, password } = item;
    configObj.auths[url] = {};
    configObj.auths[url].auth = window.btoa(username + ':' + password);
  });
  const dockerconfig: api.IDockerConfig = { dockerconfig: window.btoa(JSON.stringify(configObj)) };
  if(resourceVersion) {
    dockerconfig.resourceVersion = resourceVersion;
  }
  return DwApi.putDockerConfig(namespace, dockerconfig);
}

const unloadedState: State = {
  isLoading: false,
  registries: [],
  resourceVersion: undefined,
  error: undefined,
};

export const reducer: Reducer<State> = (state: State | undefined, action: KnownAction): State => {
  if (state === undefined) {
    return unloadedState;
  }

  switch (action.type) {
    case 'REQUEST_DEVWORKSPACE_CREDENTIALS':
      return createObject(state, {
        isLoading: true,
        error: undefined,
      });
    case 'SET_DEVWORKSPACE_CREDENTIALS':
      return createObject(state, {
        isLoading: false,
        registries: action.registries,
        resourceVersion: action.resourceVersion,
      });
    case 'RECEIVE_DEVWORKSPACE_CREDENTIALS_ERROR':
      return createObject(state, {
        isLoading: false,
        error: action.error,
      });
    default:
      return state;
  }

};

