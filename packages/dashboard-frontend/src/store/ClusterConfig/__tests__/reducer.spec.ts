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

import { ClusterConfig } from '@eclipse-che/common';

import {
  clusterConfigErrorAction,
  clusterConfigReceiveAction,
  clusterConfigRequestAction,
} from '@/store/ClusterConfig/actions';
import { reducer, State, unloadedState } from '@/store/ClusterConfig/reducer';

describe('ClusterConfig, reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle clusterConfigRequestAction', () => {
    const action = clusterConfigRequestAction();
    const expectedState = {
      clusterConfig: {
        allWorkspacesLimit: -1,
        runningWorkspacesLimit: 1,
      },
      isLoading: true,
      error: undefined,
    } as State;

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle clusterConfigReceiveAction', () => {
    const clusterConfig: ClusterConfig = {
      dashboardWarning: 'Maintenance warning info',
      allWorkspacesLimit: -1,
      runningWorkspacesLimit: 1,
      currentArchitecture: 'amd64',
    };

    const action = clusterConfigReceiveAction(clusterConfig);

    const expectedState = {
      clusterConfig,
      isLoading: false,
      error: undefined,
    } as State;

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle clusterConfigErrorAction', () => {
    const action = clusterConfigErrorAction('Error message');
    const expectedState = {
      clusterConfig: {
        allWorkspacesLimit: -1,
        runningWorkspacesLimit: 1,
      },
      isLoading: false,
      error: 'Error message',
    } as State;

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should return the current state for unknown actions', () => {
    const unknownAction = { type: 'UNKNOWN_ACTION' };
    const currentState = {
      clusterConfig: {
        allWorkspacesLimit: -1,
        runningWorkspacesLimit: 1,
      },
      isLoading: false,
      error: undefined,
    } as State;

    expect(reducer(currentState, unknownAction)).toEqual(currentState);
  });
});
