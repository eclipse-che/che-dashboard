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
  backendCheckErrorAction,
  backendCheckReceiveAction,
  backendCheckRequestAction,
} from '@/store/SanityCheck/actions';
import { reducer, State, unloadedState } from '@/store/SanityCheck/reducer';

describe('SanityCheck reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle backendCheckRequestAction', () => {
    const payload = {
      lastFetched: Date.now(),
    };
    const action = backendCheckRequestAction(payload);
    const expectedState: State = {
      ...initialState,
      lastFetched: payload.lastFetched,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle backendCheckReceiveAction', () => {
    const action = backendCheckReceiveAction();
    const expectedState: State = {
      ...initialState,
      error: undefined,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle backendCheckErrorAction', () => {
    const error = 'Error message';
    const action = backendCheckErrorAction(error);
    const expectedState: State = {
      ...initialState,
      authorized: false,
      error,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should return the current state for unknown actions', () => {
    const unknownAction = { type: 'UNKNOWN_ACTION' } as UnknownAction;
    expect(reducer(initialState, unknownAction)).toEqual(initialState);
  });
});
