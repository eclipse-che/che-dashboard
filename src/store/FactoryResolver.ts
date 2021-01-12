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
import { FactoryResolver } from '../services/helpers/types';
import { AppThunk } from './';
import { container } from '../inversify.config';
import { CheWorkspaceClient } from '../services/cheWorkspaceClient';

const WorkspaceClient = container.get(CheWorkspaceClient);

export interface State {
  isLoading: boolean;
  resolver: {
    location?: string;
    source?: string;
    devfile?: api.che.workspace.devfile.Devfile;
  }
}

interface RequestFactoryResolverAction {
  type: 'REQUEST_FACTORY_RESOLVER';
}

interface ReceiveFactoryResolverAction {
  type: 'RECEIVE_FACTORY_RESOLVER';
  resolver: { location?: string; devfile?: api.che.workspace.devfile.Devfile; }
}

type KnownAction = RequestFactoryResolverAction
  | ReceiveFactoryResolverAction;

export type ActionCreators = {
  requestFactoryResolver: (location: string) => AppThunk<KnownAction, Promise<void>>;
};

export const actionCreators: ActionCreators = {
  requestFactoryResolver: (location: string): AppThunk<KnownAction, Promise<void>> => async (dispatch): Promise<void> => {
    dispatch({ type: 'REQUEST_FACTORY_RESOLVER' });

    try {
      const data = await WorkspaceClient.restApiClient.getFactoryResolver<FactoryResolver>(location);
      if (!data.devfile) {
        throw new Error('The specified link does not contain a valid Devfile.');
      }
      dispatch({ type: 'RECEIVE_FACTORY_RESOLVER', resolver: { location: location, devfile: data.devfile, source: data.source } });
      return;
    } catch (e) {
      throw new Error(e.message ? e.message : 'Failed to request factory resolver');
    }
  },

};

const unloadedState: State = {
  isLoading: false,
  resolver: {}
};

export const reducer: Reducer<State> = (state: State | undefined, incomingAction: Action): State => {
  if (state === undefined) {
    return unloadedState;
  }

  const action = incomingAction as KnownAction;
  switch (action.type) {
    case 'REQUEST_FACTORY_RESOLVER':
      return Object.assign({}, state, {
        isLoading: true,
      });
    case 'RECEIVE_FACTORY_RESOLVER':
      return Object.assign({}, state, {
        resolver: action.resolver,
      });
    default:
      return state;
  }
};
