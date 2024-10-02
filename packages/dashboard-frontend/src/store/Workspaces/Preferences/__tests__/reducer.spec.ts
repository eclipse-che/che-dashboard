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
  preferencesErrorAction,
  preferencesReceiveAction,
  preferencesRequestAction,
} from '@/store/Workspaces/Preferences/actions';
import { reducer, State, unloadedState } from '@/store/Workspaces/Preferences/reducer';

describe('Preferences, reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle preferencesRequestAction', () => {
    const action = preferencesRequestAction();
    const expectedState: State = {
      ...initialState,
      isLoading: true,
    };
    const newState = reducer(initialState, action);
    expect(newState).toEqual(expectedState);
  });

  it('should handle preferencesReceiveAction with payload', () => {
    const mockPreferences = {
      'skip-authorisation': ['azure-devops'],
    } as api.IWorkspacePreferences;
    const action = preferencesReceiveAction(mockPreferences);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      preferences: mockPreferences,
    };
    const newState = reducer(initialState, action);
    expect(newState).toEqual(expectedState);
  });

  it('should handle preferencesReceiveAction without payload', () => {
    const action = preferencesReceiveAction(undefined);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
    };
    const newState = reducer(initialState, action);
    expect(newState).toEqual(expectedState);
  });

  it('should handle preferencesErrorAction', () => {
    const errorMessage = 'An error occurred';
    const action = preferencesErrorAction(errorMessage);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      error: errorMessage,
    };
    const newState = reducer(initialState, action);
    expect(newState).toEqual(expectedState);
  });

  it('should return the current state for unknown actions', () => {
    const unknownAction = { type: 'UNKNOWN_ACTION' } as UnknownAction;
    const newState = reducer(initialState, unknownAction);
    expect(newState).toEqual(initialState);
  });
});
