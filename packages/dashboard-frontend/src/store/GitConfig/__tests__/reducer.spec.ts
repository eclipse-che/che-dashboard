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
  gitConfigErrorAction,
  gitConfigReceiveAction,
  gitConfigRequestAction,
} from '@/store/GitConfig/actions';
import { reducer, State, unloadedState } from '@/store/GitConfig/reducer';

describe('GitConfig, reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle gitConfigRequestAction', () => {
    const action = gitConfigRequestAction();
    const expectedState: State = {
      ...initialState,
      isLoading: true,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle gitConfigReceiveAction', () => {
    const config = { gitconfig: {} } as api.IGitConfig;
    const action = gitConfigReceiveAction(config);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      config,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle gitConfigErrorAction', () => {
    const error = 'Error message';
    const action = gitConfigErrorAction(error);
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
