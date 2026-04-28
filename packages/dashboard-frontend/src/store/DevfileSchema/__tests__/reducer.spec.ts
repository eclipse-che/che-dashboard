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

import { DevfileSchema } from '@/services/backend-client/devfileSchemaApi';
import {
  devfileSchemaErrorAction,
  devfileSchemaReceiveAction,
  devfileSchemaRequestAction,
} from '@/store/DevfileSchema/actions';
import { reducer, State, unloadedState } from '@/store/DevfileSchema/reducer';

describe('DevfileSchema reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle devfileSchemaRequestAction', () => {
    const action = devfileSchemaRequestAction();
    const expectedState = {
      isLoading: true,
      schema: undefined,
      error: undefined,
    } as State;

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle devfileSchemaReceiveAction', () => {
    const schema = { type: 'object' } as DevfileSchema;
    const action = devfileSchemaReceiveAction(schema);
    const expectedState = {
      isLoading: false,
      schema,
    } as State;

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle devfileSchemaErrorAction', () => {
    const action = devfileSchemaErrorAction('Error message');
    const expectedState = {
      isLoading: false,
      schema: undefined,
      error: 'Error message',
    } as State;

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should return the current state for unknown actions', () => {
    const unknownAction = { type: 'UNKNOWN_ACTION' };
    const currentState = {
      isLoading: false,
      schema: undefined,
      error: undefined,
    } as State;

    expect(reducer(currentState, unknownAction)).toEqual(currentState);
  });
});
