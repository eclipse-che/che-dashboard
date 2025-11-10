/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { UnknownAction } from 'redux';

import {
  devWorkspacesClusterErrorAction,
  devWorkspacesClusterReceiveAction,
  devWorkspacesClusterRequestAction,
} from '@/store/DevWorkspacesCluster/actions';
import { reducer, State, unloadedState } from '@/store/DevWorkspacesCluster/reducer';

describe('DevWorkspacesCluster, reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle devWorkspacesClusterRequestAction', () => {
    const action = devWorkspacesClusterRequestAction();
    const expectedState: State = {
      ...initialState,
      isLoading: true,
      error: undefined,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle devWorkspacesClusterReceiveAction', () => {
    const action = devWorkspacesClusterReceiveAction(true);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      isRunningDevWorkspacesClusterLimitExceeded: true,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle devWorkspacesClusterErrorAction', () => {
    const action = devWorkspacesClusterErrorAction('Error message');
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      error: 'Error message',
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should return the current state for unknown actions', () => {
    const unknownAction = { type: 'UNKNOWN_ACTION' } as UnknownAction;
    expect(reducer(initialState, unknownAction)).toEqual(unloadedState);
  });
});
