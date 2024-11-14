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

import {
  tokenAddAction,
  tokenErrorAction,
  tokenReceiveAction,
  tokenRemoveAction,
  tokenRequestAction,
  tokenUpdateAction,
} from '@/store/PersonalAccessTokens/actions';
import { reducer, State, unloadedState } from '@/store/PersonalAccessTokens/reducer';

describe('PersonalAccessTokens, reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle tokenRequestAction', () => {
    const action = tokenRequestAction();
    const expectedState: State = {
      ...initialState,
      isLoading: true,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle tokenReceiveAction', () => {
    const tokens = [{ tokenName: 'token1' }] as api.PersonalAccessToken[];
    const action = tokenReceiveAction(tokens);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      tokens,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle tokenAddAction', () => {
    const token = { tokenName: 'token1' } as api.PersonalAccessToken;
    const action = tokenAddAction(token);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      tokens: [token],
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle tokenUpdateAction', () => {
    const initialStateWithTokens: State = {
      ...initialState,
      tokens: [
        { tokenName: 'token1', tokenData: 'oldValue' },
        { tokenName: 'token2' },
      ] as api.PersonalAccessToken[],
    };
    const updatedToken = { tokenName: 'token1', tokenData: 'newValue' } as api.PersonalAccessToken;

    const action = tokenUpdateAction(updatedToken);

    const expectedState: State = {
      ...initialStateWithTokens,
      isLoading: false,
      tokens: [updatedToken, initialStateWithTokens.tokens[1]],
    };
    expect(reducer(initialStateWithTokens, action)).toEqual(expectedState);
  });

  it('should handle tokenRemoveAction', () => {
    const initialStateWithTokens: State = {
      ...initialState,
      tokens: [{ tokenName: 'token1' }] as api.PersonalAccessToken[],
    };

    const action = tokenRemoveAction({ tokenName: 'token1' } as api.PersonalAccessToken);

    const expectedState: State = {
      ...initialStateWithTokens,
      isLoading: false,
      tokens: [],
    };
    expect(reducer(initialStateWithTokens, action)).toEqual(expectedState);
  });

  it('should handle tokenErrorAction', () => {
    const error = 'Error message';
    const action = tokenErrorAction(error);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      error,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should return the current state for unknown actions', () => {
    const unknownAction = { type: 'UNKNOWN_ACTION' } as any;
    expect(reducer(initialState, unknownAction)).toEqual(initialState);
  });
});
