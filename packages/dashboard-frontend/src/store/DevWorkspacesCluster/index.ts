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

import common from '@eclipse-che/common';
import { Action, Reducer } from 'redux';

import { IsRunningDevWorkspacesClusterLimitExceeded } from '@/services/backend-client/devWorkspaceClusterApi';
import { createObject } from '@/store/helpers';
import { AUTHORIZED, SanityCheckAction } from '@/store/sanityCheckMiddleware';

import { AppThunk } from '..';

export interface State {
  isLoading: boolean;
  isRunningDevWorkspacesClusterLimitExceeded: boolean;
  error?: string;
}

export class RunningDevWorkspacesClusterLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RunningDevWorkspacesClusterLimitExceededError';
  }
}

export function throwRunningDevWorkspacesClusterLimitExceededError() {
  throw new RunningDevWorkspacesClusterLimitExceededError(
    'Exceeded the cluster limit for running DevWorkspaces',
  );
}

export interface RequestDevWorkspacesClusterAction extends Action, SanityCheckAction {
  type: 'REQUEST_DEVWORKSPACES_CLUSTER';
}

export interface ReceivedDevWorkspacesClusterAction {
  type: 'RECEIVED_DEVWORKSPACES_CLUSTER';
  isRunningDevWorkspacesClusterLimitExceeded: boolean;
}

export interface ReceivedDevWorkspacesClusterErrorAction {
  type: 'RECEIVED_DEVWORKSPACES_CLUSTER_ERROR';
  error: string;
}

type KnownAction =
  | RequestDevWorkspacesClusterAction
  | ReceivedDevWorkspacesClusterAction
  | ReceivedDevWorkspacesClusterErrorAction;

export type ActionCreators = {
  requestRunningDevWorkspacesClusterLimitExceeded: () => AppThunk<KnownAction, Promise<void>>;
};

export const actionCreators: ActionCreators = {
  requestRunningDevWorkspacesClusterLimitExceeded:
    (): AppThunk<KnownAction, Promise<void>> =>
    async (dispatch): Promise<void> => {
      dispatch({
        type: 'REQUEST_DEVWORKSPACES_CLUSTER',
        check: AUTHORIZED,
      });

      try {
        const isRunningDevWorkspacesClusterLimitExceeded =
          await IsRunningDevWorkspacesClusterLimitExceeded();
        dispatch({
          type: 'RECEIVED_DEVWORKSPACES_CLUSTER',
          isRunningDevWorkspacesClusterLimitExceeded,
        });
      } catch (e) {
        dispatch({
          type: 'RECEIVED_DEVWORKSPACES_CLUSTER_ERROR',
          error: common.helpers.errors.getMessage(e),
        });
        throw e;
      }
    },
};

const unloadedState: State = {
  isLoading: false,
  isRunningDevWorkspacesClusterLimitExceeded: false,
};

export const reducer: Reducer<State> = (
  state: State | undefined,
  incomingAction: Action,
): State => {
  if (state === undefined) {
    return unloadedState;
  }

  const action = incomingAction as KnownAction;
  switch (action.type) {
    case 'REQUEST_DEVWORKSPACES_CLUSTER':
      return createObject<State>(state, {
        isLoading: true,
        error: undefined,
      });
    case 'RECEIVED_DEVWORKSPACES_CLUSTER':
      return createObject<State>(state, {
        isLoading: false,
        isRunningDevWorkspacesClusterLimitExceeded:
          action.isRunningDevWorkspacesClusterLimitExceeded,
      });
    case 'RECEIVED_DEVWORKSPACES_CLUSTER_ERROR':
      return createObject<State>(state, {
        isLoading: false,
        error: action.error,
      });
    default:
      return state;
  }
};