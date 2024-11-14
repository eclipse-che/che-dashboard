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

import { UnknownAction } from 'redux';

import {
  cheUserIdErrorAction,
  cheUserIdReceiveAction,
  cheUserIdRequestAction,
} from '@/store/User/Id/actions';
import { reducer, State, unloadedState } from '@/store/User/Id/reducer';

describe('CheUserId, reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle cheUserIdRequestAction', () => {
    const action = cheUserIdRequestAction();
    const expectedState: State = {
      ...initialState,
      isLoading: true,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle cheUserIdReceiveAction', () => {
    const cheUserId = 'test-user-id';
    const action = cheUserIdReceiveAction(cheUserId);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      cheUserId,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle cheUserIdErrorAction', () => {
    const error = 'Error message';
    const action = cheUserIdErrorAction(error);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      error,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should return the current state for unknown actions', () => {
    const unknownAction = { type: 'UNKNOWN_ACTION' } as UnknownAction;
    expect(reducer(initialState, unknownAction)).toEqual(initialState);
  });
});
