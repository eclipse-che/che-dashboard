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
  qualifiedNameClearAction,
  qualifiedNameSetAction,
  workspaceUIDClearAction,
  workspaceUIDSetAction,
} from '@/store/Workspaces/actions';
import { reducer, State, unloadedState } from '@/store/Workspaces/reducer';

describe('Workspaces reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle qualifiedNameClearAction', () => {
    const action = qualifiedNameClearAction();
    const expectedState: State = {
      ...initialState,
      namespace: '',
      workspaceName: '',
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle qualifiedNameSetAction', () => {
    const payload = { namespace: 'test-namespace', workspaceName: 'test-workspace' };
    const action = qualifiedNameSetAction(payload);
    const expectedState: State = {
      ...initialState,
      namespace: payload.namespace,
      workspaceName: payload.workspaceName,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle workspaceUIDClearAction', () => {
    const action = workspaceUIDClearAction();
    const expectedState: State = {
      ...initialState,
      workspaceUID: '',
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle workspaceUIDSetAction', () => {
    const payload = 'test-uid';
    const action = workspaceUIDSetAction(payload);
    const expectedState: State = {
      ...initialState,
      workspaceUID: payload,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should return the current state for unknown actions', () => {
    const unknownAction = { type: 'UNKNOWN_ACTION' } as UnknownAction;
    expect(reducer(initialState, unknownAction)).toEqual(initialState);
  });
});
