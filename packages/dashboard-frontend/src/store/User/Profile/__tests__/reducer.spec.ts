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
  userProfileErrorAction,
  userProfileReceiveAction,
  userProfileRequestAction,
} from '@/store/User/Profile/actions';
import { reducer, State, unloadedState } from '@/store/User/Profile/reducer';

describe('UserProfile, reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle userProfileRequestAction', () => {
    const action = userProfileRequestAction();
    const expectedState: State = {
      ...initialState,
      isLoading: true,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle userProfileReceiveAction', () => {
    const userProfile = { email: 'test@example.com', username: 'testuser' } as api.IUserProfile;
    const action = userProfileReceiveAction(userProfile);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      userProfile,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle userProfileErrorAction', () => {
    const error = 'Error message';
    const action = userProfileErrorAction(error);
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
