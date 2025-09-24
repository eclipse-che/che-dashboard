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

import devfileApi from '@/services/devfileApi';
import {
  factoryResolverErrorAction,
  factoryResolverReceiveAction,
  factoryResolverRequestAction,
} from '@/store/FactoryResolver/actions';
import { reducer, State, unloadedState } from '@/store/FactoryResolver/reducer';

describe('FactoryResolver reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle factoryResolverRequestAction', () => {
    const action = factoryResolverRequestAction();
    const expectedState: State = {
      ...initialState,
      isLoading: true,
      error: undefined,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle factoryResolverReceiveAction', () => {
    const resolver = {
      devfile: {} as devfileApi.Devfile,
      optionalFilesContent: { 'README.md': { location: 'location', content: 'Content' } },
    };
    const action = factoryResolverReceiveAction(resolver);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      resolver,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle factoryResolverErrorAction', () => {
    const error = 'Error message';
    const action = factoryResolverErrorAction(error);
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
