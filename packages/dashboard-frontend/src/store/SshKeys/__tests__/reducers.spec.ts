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

import { api } from '@eclipse-che/common';
import { UnknownAction } from 'redux';

import {
  keysAddAction,
  keysErrorAction,
  keysReceiveAction,
  keysRemoveAction,
  keysRequestAction,
} from '@/store/SshKeys/actions';
import { reducer, State, unloadedState } from '@/store/SshKeys/reducer';

describe('SshKeys, reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle keysRequestAction', () => {
    const action = keysRequestAction();
    const expectedState: State = {
      ...initialState,
      isLoading: true,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle keysReceiveAction', () => {
    const keys = [{ name: 'key1' }] as api.SshKey[];
    const action = keysReceiveAction(keys);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      keys,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle keysAddAction', () => {
    const key = { name: 'key1' } as api.SshKey;
    const action = keysAddAction(key);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      keys: [key],
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle keysRemoveAction', () => {
    const initialStateWithKeys: State = {
      ...initialState,
      keys: [{ name: 'key1' }, { name: 'key2' }] as api.SshKey[],
    };
    const action = keysRemoveAction({ name: 'key1' } as api.SshKey);
    const expectedState: State = {
      ...initialStateWithKeys,
      isLoading: false,
      keys: [{ name: 'key2' }] as api.SshKey[],
    };

    expect(reducer(initialStateWithKeys, action)).toEqual(expectedState);
  });

  it('should handle keysErrorAction', () => {
    const error = 'Error message';
    const action = keysErrorAction(error);
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
