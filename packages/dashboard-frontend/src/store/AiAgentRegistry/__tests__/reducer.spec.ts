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
  aiAgentRegistryErrorAction,
  aiAgentRegistryReceiveAction,
  aiAgentRegistryRequestAction,
} from '@/store/AiAgentRegistry/actions';
import { reducer, State, unloadedState } from '@/store/AiAgentRegistry/reducer';

describe('AiAgentRegistry reducer', () => {
  let initialState: State;

  const testRegistry: api.IAiAgentRegistry = {
    agents: [
      {
        id: 'test',
        name: 'Test Agent',
        publisher: 'test',
        description: 'desc',
        icon: '',
        docsUrl: '',
        image: 'img',
        tag: 'v1',
        memoryLimit: '4Gi',
        cpuLimit: '1',
        terminalPort: 8080,
        env: [],
        initCommand: 'cmd',
      },
    ],
    defaultAgentId: 'test',
  };

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle aiAgentRegistryRequestAction', () => {
    const action = aiAgentRegistryRequestAction();
    const expectedState = {
      isLoading: true,
      agents: [],
      defaultAgentId: '',
      error: undefined,
    } as State;

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle aiAgentRegistryReceiveAction', () => {
    const action = aiAgentRegistryReceiveAction(testRegistry);
    const expectedState = {
      isLoading: false,
      agents: testRegistry.agents,
      defaultAgentId: 'test',
    } as State;

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle aiAgentRegistryErrorAction', () => {
    const action = aiAgentRegistryErrorAction('Error message');
    const expectedState = {
      isLoading: false,
      agents: [],
      defaultAgentId: '',
      error: 'Error message',
    } as State;

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should return the current state for unknown actions', () => {
    const unknownAction = { type: 'UNKNOWN_ACTION' };
    const currentState = {
      isLoading: false,
      agents: [],
      defaultAgentId: '',
      error: undefined,
    } as State;

    expect(reducer(currentState, unknownAction)).toEqual(currentState);
  });
});
