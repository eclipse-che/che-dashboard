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

import { ClusterInfo } from '@eclipse-che/common';

import {
  clusterInfoErrorAction,
  clusterInfoReceiveAction,
  clusterInfoRequestAction,
} from '@/store/ClusterInfo/actions';
import { reducer, State, unloadedState } from '@/store/ClusterInfo/reducer';

describe('ClusterInfo reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle clusterInfoRequestAction', () => {
    const action = clusterInfoRequestAction();
    const expectedState = {
      clusterInfo: {
        applications: [],
      },
      isLoading: true,
      error: undefined,
    } as State;

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle clusterInfoReceiveAction', () => {
    const clusterInfo: ClusterInfo = {
      applications: [{ title: 'app1', icon: 'icon1', url: 'url1' }],
    };

    const action = clusterInfoReceiveAction(clusterInfo);

    const expectedState = {
      clusterInfo,
      isLoading: false,
      error: undefined,
    } as State;

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle clusterInfoErrorAction', () => {
    const action = clusterInfoErrorAction('Error message');
    const expectedState = {
      clusterInfo: {
        applications: [],
      },
      isLoading: false,
      error: 'Error message',
    } as State;

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should return the current state for unknown actions', () => {
    const unknownAction = { type: 'UNKNOWN_ACTION' };
    const currentState = {
      clusterInfo: {
        applications: [],
      },
      isLoading: false,
      error: undefined,
    } as State;

    expect(reducer(currentState, unknownAction)).toEqual(currentState);
  });
});
