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
  dockerConfigErrorAction,
  dockerConfigReceiveAction,
  dockerConfigRequestAction,
} from '@/store/DockerConfig/actions';
import { reducer, RegistryEntry, State, unloadedState } from '@/store/DockerConfig/reducer';

describe('DockerConfig, reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle dockerConfigRequestAction', () => {
    const action = dockerConfigRequestAction();
    const expectedState: State = {
      ...initialState,
      isLoading: true,
      error: undefined,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle dockerConfigReceiveAction', () => {
    const registries = [
      { url: 'https://registry.com', username: 'user', password: 'pass' },
    ] as RegistryEntry[];
    const action = dockerConfigReceiveAction({ registries });
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      registries,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle dockerConfigErrorAction', () => {
    const error = 'Error message';
    const action = dockerConfigErrorAction(error);
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
