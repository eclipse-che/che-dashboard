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

import { api } from '@eclipse-che/common';
import { UnknownAction } from 'redux';

import {
  deviceAuthTokenErrorAction,
  deviceAuthTokenReceiveAction,
  deviceAuthTokenRemoveAction,
  deviceAuthTokenRequestAction,
} from '@/store/DeviceAuthToken/actions';
import { DeviceAuthTokenState, reducer, unloadedState } from '@/store/DeviceAuthToken/reducer';

describe('DeviceAuthToken, reducer', () => {
  let initialState: DeviceAuthTokenState;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle deviceAuthTokenRequestAction', () => {
    const action = deviceAuthTokenRequestAction();
    const expectedState: DeviceAuthTokenState = {
      ...initialState,
      isLoading: true,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle deviceAuthTokenReceiveAction', () => {
    const tokens = [{ name: 'device-authentication-secret-abc12' }] as api.DeviceAuthToken[];
    const action = deviceAuthTokenReceiveAction(tokens);
    const expectedState: DeviceAuthTokenState = {
      ...initialState,
      isLoading: false,
      tokens,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle deviceAuthTokenRemoveAction — filters by name', () => {
    const token1: api.DeviceAuthToken = { name: 'device-authentication-secret-abc12' };
    const token2: api.DeviceAuthToken = { name: 'device-authentication-secret-xyz34' };
    const stateWithTokens: DeviceAuthTokenState = {
      ...initialState,
      tokens: [token1, token2],
    };

    const action = deviceAuthTokenRemoveAction(token1.name);
    const expectedState: DeviceAuthTokenState = {
      ...stateWithTokens,
      isLoading: false,
      tokens: [token2],
    };

    expect(reducer(stateWithTokens, action)).toEqual(expectedState);
  });

  it('should handle deviceAuthTokenErrorAction', () => {
    const error = 'Something went wrong';
    const action = deviceAuthTokenErrorAction(error);
    const expectedState: DeviceAuthTokenState = {
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
