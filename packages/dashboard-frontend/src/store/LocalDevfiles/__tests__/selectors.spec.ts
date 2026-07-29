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

import { RootState } from '@/store';
import { AgentPodPhase, AgentPodStatus, LocalDevfile } from '@/store/LocalDevfiles';
import {
  selectAgentPodStatuses,
  selectAgentTerminalUrl,
  selectLocalDevfileById,
  selectLocalDevfileByName,
  selectLocalDevfiles,
  selectLocalDevfilesError,
  selectLocalDevfilesIsLoading,
} from '@/store/LocalDevfiles/selectors';

describe('LocalDevfiles selectors', () => {
  const testDevfile: LocalDevfile = {
    id: 'uuid-1',
    name: 'test-devfile',
    description: '',
    content: 'schemaVersion: 2.2.2',
    projectNames: [],
    lastModified: '2025-01-01T00:00:00.000Z',
  };

  const testPodStatus: AgentPodStatus = {
    agentId: 'agent-1',
    name: 'agent-pod-1',
    phase: AgentPodPhase.RUNNING,
    ready: true,
    serviceUrl: 'http://agent-1:8080',
  };

  const mockState = {
    localDevfiles: {
      devfiles: [testDevfile],
      isLoading: false,
      error: 'Something went wrong',
      agentTerminalUrl: 'http://localhost:8080/terminal',
      agentPodStatuses: [testPodStatus],
      configMapResourceVersion: '123',
    },
  } as Partial<RootState> as RootState;

  it('should return devfiles array', () => {
    const result = selectLocalDevfiles(mockState);
    expect(result).toEqual([testDevfile]);
  });

  it('should return isLoading', () => {
    const result = selectLocalDevfilesIsLoading(mockState);
    expect(result).toBe(false);
  });

  it('should return error', () => {
    const result = selectLocalDevfilesError(mockState);
    expect(result).toBe('Something went wrong');
  });

  it('should return matching devfile by id', () => {
    const result = selectLocalDevfileById('uuid-1')(mockState);
    expect(result).toEqual(testDevfile);
  });

  it('should return undefined for non-existent id', () => {
    const result = selectLocalDevfileById('non-existent')(mockState);
    expect(result).toBeUndefined();
  });

  it('should return matching devfile by name', () => {
    const result = selectLocalDevfileByName('test-devfile')(mockState);
    expect(result).toEqual(testDevfile);
  });

  it('should return terminal URL', () => {
    const result = selectAgentTerminalUrl(mockState);
    expect(result).toBe('http://localhost:8080/terminal');
  });

  it('should return pod statuses array', () => {
    const result = selectAgentPodStatuses(mockState);
    expect(result).toEqual([testPodStatus]);
  });
});
