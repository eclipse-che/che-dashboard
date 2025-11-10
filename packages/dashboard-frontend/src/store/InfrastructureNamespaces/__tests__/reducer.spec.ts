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

import { UnknownAction } from '@reduxjs/toolkit';

import { che } from '@/services/models';
import {
  namespaceErrorAction,
  namespaceReceiveAction,
  namespaceRequestAction,
} from '@/store/InfrastructureNamespaces/actions';
import { reducer, State, unloadedState } from '@/store/InfrastructureNamespaces/reducer';

describe('InfrastructureNamespaces, reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle namespaceRequestAction', () => {
    const action = namespaceRequestAction();
    const expectedState: State = {
      ...initialState,
      isLoading: true,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle namespaceReceiveAction', () => {
    const namespaces = [
      { name: 'namespace1' },
      { name: 'namespace2' },
    ] as che.KubernetesNamespace[];
    const action = namespaceReceiveAction(namespaces);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      namespaces,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle namespaceErrorAction', () => {
    const error = 'Error message';
    const action = namespaceErrorAction(error);
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
