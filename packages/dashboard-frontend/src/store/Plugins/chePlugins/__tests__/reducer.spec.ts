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

import { che } from '@/services/models';
import {
  pluginsErrorAction,
  pluginsReceiveAction,
  pluginsRequestAction,
} from '@/store/Plugins/chePlugins/actions';
import { reducer, State, unloadedState } from '@/store/Plugins/chePlugins/reducer';

describe('Plugins reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = unloadedState;
  });

  it('should handle pluginsRequestAction', () => {
    const action = pluginsRequestAction();
    const expectedState: State = {
      ...initialState,
      isLoading: true,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle pluginsReceiveAction', () => {
    const plugins = [{ id: 'plugin1' }, { id: 'plugin2' }] as che.Plugin[];
    const action = pluginsReceiveAction(plugins);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      plugins,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle pluginsErrorAction', () => {
    const error = 'Error message';
    const action = pluginsErrorAction(error);
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
