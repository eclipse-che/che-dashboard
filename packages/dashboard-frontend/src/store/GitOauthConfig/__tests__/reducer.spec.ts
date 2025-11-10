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

import {
  gitOauthDeleteAction,
  gitOauthErrorAction,
  gitOauthReceiveAction,
  gitOauthRequestAction,
  skipOauthReceiveAction,
} from '@/store/GitOauthConfig/actions';
import { IGitOauth, reducer, State, unloadedState } from '@/store/GitOauthConfig/reducer';

describe('GitOauthConfig, reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle gitOauthRequestAction', () => {
    const action = gitOauthRequestAction();
    const expectedState: State = {
      ...initialState,
      isLoading: true,
      error: undefined,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle gitOauthReceiveAction', () => {
    const payload = {
      supportedGitOauth: [
        {
          name: 'github',
          endpointUrl: 'https://github.com',
        },
      ] as IGitOauth[],
      providersWithToken: ['github'] as api.GitOauthProvider[],
    };
    const action = gitOauthReceiveAction(payload);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      gitOauth: payload.supportedGitOauth,
      providersWithToken: payload.providersWithToken,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle skipOauthReceiveAction', () => {
    const payload = ['github'] as api.GitOauthProvider[];
    const action = skipOauthReceiveAction(payload);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      skipOauthProviders: payload,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle gitOauthDeleteAction', () => {
    const initialStateWithProviders: State = {
      ...initialState,
      providersWithToken: ['github', 'gitlab'],
    };
    const action = gitOauthDeleteAction('github');
    const expectedState: State = {
      ...initialStateWithProviders,
      isLoading: false,
      providersWithToken: ['gitlab'],
    };

    expect(reducer(initialStateWithProviders, action)).toEqual(expectedState);
  });

  it('should handle gitOauthErrorAction', () => {
    const error = 'Error message';
    const action = gitOauthErrorAction(error);
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
