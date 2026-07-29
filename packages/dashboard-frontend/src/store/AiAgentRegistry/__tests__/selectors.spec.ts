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

import { RootState } from '@/store';
import {
  selectAiAgentRegistryEnabled,
  selectAiAgentRegistryError,
  selectAiAgentRegistryIsLoading,
  selectAiAgents,
  selectDefaultAgent,
  selectDefaultAgentId,
} from '@/store/AiAgentRegistry/selectors';

describe('AiAgentRegistry selectors', () => {
  const testAgent: api.AiAgentDefinition = {
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
  };

  const secondAgent: api.AiAgentDefinition = {
    id: 'second',
    name: 'Second Agent',
    publisher: 'test',
    description: 'desc2',
    icon: '',
    docsUrl: '',
    image: 'img2',
    tag: 'v2',
    memoryLimit: '2Gi',
    cpuLimit: '0.5',
    terminalPort: 8081,
    env: [],
    initCommand: 'cmd2',
  };

  const mockState = {
    aiAgentRegistry: {
      isLoading: false,
      agents: [testAgent, secondAgent],
      defaultAgentId: 'test',
      error: 'Something went wrong',
    },
  } as Partial<RootState> as RootState;

  it('should return agents array', () => {
    const result = selectAiAgents(mockState);
    expect(result).toEqual([testAgent, secondAgent]);
  });

  it('should return defaultAgentId', () => {
    const result = selectDefaultAgentId(mockState);
    expect(result).toBe('test');
  });

  it('should return agent matching defaultAgentId', () => {
    const result = selectDefaultAgent(mockState);
    expect(result).toEqual(testAgent);
  });

  it('should return first agent if defaultAgentId does not match', () => {
    const stateWithUnknownDefault = {
      aiAgentRegistry: {
        isLoading: false,
        agents: [testAgent, secondAgent],
        defaultAgentId: 'non-existent',
      },
    } as Partial<RootState> as RootState;

    const result = selectDefaultAgent(stateWithUnknownDefault);
    expect(result).toEqual(testAgent);
  });

  it('should return undefined if no agents', () => {
    const emptyState = {
      aiAgentRegistry: {
        isLoading: false,
        agents: [],
        defaultAgentId: '',
      },
    } as Partial<RootState> as RootState;

    const result = selectDefaultAgent(emptyState);
    expect(result).toBeUndefined();
  });

  it('should return true when agents exist', () => {
    const result = selectAiAgentRegistryEnabled(mockState);
    expect(result).toBe(true);
  });

  it('should return false when no agents', () => {
    const emptyState = {
      aiAgentRegistry: {
        isLoading: false,
        agents: [],
        defaultAgentId: '',
      },
    } as Partial<RootState> as RootState;

    const result = selectAiAgentRegistryEnabled(emptyState);
    expect(result).toBe(false);
  });

  it('should return isLoading', () => {
    const loadingState = {
      aiAgentRegistry: {
        isLoading: true,
        agents: [],
        defaultAgentId: '',
      },
    } as Partial<RootState> as RootState;

    const result = selectAiAgentRegistryIsLoading(loadingState);
    expect(result).toBe(true);
  });

  it('should return error', () => {
    const result = selectAiAgentRegistryError(mockState);
    expect(result).toBe('Something went wrong');
  });
});
