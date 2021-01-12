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
import { container } from '../inversify.config';
import { CheWorkspaceClient } from '../services/cheWorkspaceClient';
import { AppThunkAction, AppState } from './';

const WorkspaceClient = container.get(CheWorkspaceClient);

export interface State {
  isLoading: boolean;
  namespaces: che.KubernetesNamespace[];
}

interface RequestNamespacesAction {
  type: 'REQUEST_NAMESPACES';
}

interface ReceiveNamespacesAction {
  type: 'RECEIVE_NAMESPACES';
  namespaces: che.KubernetesNamespace[];
}

type KnownAction = RequestNamespacesAction
  | ReceiveNamespacesAction;

// todo proper type instead of 'any'
export type ActionCreators = {
  requestNamespaces: () => any;
};

export const actionCreators: ActionCreators = {

  requestNamespaces: (): AppThunkAction<KnownAction> => async (dispatch, getState): Promise<Array<che.KubernetesNamespace>> => {
    const appState: AppState = getState();
    if (!appState || !appState.infrastructureNamespace) {
      // todo throw a nice error
      throw Error('something unexpected happened');
    }

    dispatch({ type: 'REQUEST_NAMESPACES' });

    try {
      const namespaces = await WorkspaceClient.restApiClient.getKubernetesNamespace<Array<che.KubernetesNamespace>>();
      dispatch({ type: 'RECEIVE_NAMESPACES', namespaces });
      return namespaces;
    } catch (e) {
      throw new Error('Failed to request list of available kubernetes namespaces, \n' + e);
    }
  },

};

const unloadedState: State = {
  isLoading: false,
  namespaces: [],
};

export const reducer: Reducer<State> = (state: State | undefined, incomingAction: Action): State => {
  if (state === undefined) {
    return unloadedState;
  }

  const action = incomingAction as KnownAction;
  switch (action.type) {
    case 'REQUEST_NAMESPACES':
      return Object.assign({}, state, {
        isLoading: true,
      });
    case 'RECEIVE_NAMESPACES':
      return Object.assign({}, state, {
        namespaces: action.namespaces,
      });
    default:
      return state;
  }
};
