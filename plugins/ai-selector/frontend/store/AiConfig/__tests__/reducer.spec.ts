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
  aiConfigErrorAction,
  aiConfigKeyStatusReceiveAction,
  aiConfigRegistryReceiveAction,
  aiConfigRequestAction,
} from '@/plugins/ai-selector/store/AiConfig/actions';
import { AiConfigState, reducer, unloadedState } from '@/plugins/ai-selector/store/AiConfig/reducer';

describe('AiConfig, reducer', () => {
  let initialState: AiConfigState;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should return the initial state', () => {
    const unknownAction = { type: '@@INIT' } as UnknownAction;
    expect(reducer(undefined, unknownAction)).toEqual(unloadedState);
  });

  it('should handle aiConfigRequestAction', () => {
    initialState.error = 'previous error';
    const action = aiConfigRequestAction();
    const expectedState: AiConfigState = {
      ...initialState,
      isLoading: true,
      error: undefined,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle aiConfigRegistryReceiveAction', () => {
    initialState.isLoading = true;

    const registry: api.IAiRegistry = {
      providers: [
        {
          id: 'anthropic/claude',
          name: 'Claude',
          publisher: 'Anthropic',
        },
      ],
      tools: [
        {
          providerId: 'anthropic/claude',
          tag: 'latest',
          name: 'claude-tool',
          url: 'https://example.com/tool',
          binary: 'claude',
          pattern: 'init',
          injectorImage: 'quay.io/example/claude-code:latest',
        },
      ],
      defaultAiProviders: ['anthropic/claude'],
    };

    const action = aiConfigRegistryReceiveAction(registry);
    const expectedState: AiConfigState = {
      ...initialState,
      isLoading: false,
      providers: registry.providers,
      tools: registry.tools,
      defaultAiProviders: registry.defaultAiProviders,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle aiConfigKeyStatusReceiveAction', () => {
    initialState.isLoading = true;

    const providerKeyExists: Record<string, boolean> = {
      'anthropic/claude': true,
      'openai/gpt': false,
    };

    const action = aiConfigKeyStatusReceiveAction(providerKeyExists);
    const expectedState: AiConfigState = {
      ...initialState,
      isLoading: false,
      providerKeyExists,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle aiConfigErrorAction', () => {
    initialState.isLoading = true;

    const error = 'Something went wrong';
    const action = aiConfigErrorAction(error);
    const expectedState: AiConfigState = {
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
