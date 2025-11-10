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

import devfileApi from '@/services/devfileApi';
import { DevWorkspaceStatus } from '@/services/helpers/types';
import { RootState } from '@/store';
import { ClusterConfigState } from '@/store/ClusterConfig';
import { DevWorkspacesState } from '@/store/Workspaces/devWorkspaces';
import {
  selectAllDevWorkspaces,
  selectDevWorkspacesError,
  selectDevWorkspacesResourceVersion,
  selectDevWorkspacesState,
  selectDevWorkspaceWarnings,
  selectRunningDevWorkspaces,
  selectRunningDevWorkspacesLimitExceeded,
  selectStartedWorkspaces,
} from '@/store/Workspaces/devWorkspaces/selectors';

describe('DevWorkspaces Selectors', () => {
  const mockState = {
    devWorkspaces: {
      isLoading: true,
      workspaces: [
        { metadata: { uid: '1' }, status: { phase: DevWorkspaceStatus.RUNNING } },
        { metadata: { uid: '2' }, status: { phase: DevWorkspaceStatus.STOPPED } },
        { metadata: { uid: '3' }, status: { phase: DevWorkspaceStatus.STARTING } },
      ] as devfileApi.DevWorkspace[],
      resourceVersion: '12345',
      error: 'Something went wrong',
      startedWorkspaces: { '1': '1' },
      warnings: { '2': 'This is a warning' },
    } as DevWorkspacesState,
    clusterConfig: {
      clusterConfig: {
        runningWorkspacesLimit: 2,
      },
    } as ClusterConfigState,
  } as Partial<RootState> as RootState;

  it('should select devWorkspaces state', () => {
    const result = selectDevWorkspacesState(mockState);
    expect(result).toEqual(mockState.devWorkspaces);
  });

  it('should select devWorkspaces resource version', () => {
    const result = selectDevWorkspacesResourceVersion(mockState);
    expect(result).toEqual('12345');
  });

  it('should select all devWorkspaces', () => {
    const result = selectAllDevWorkspaces(mockState);
    expect(result).toEqual(mockState.devWorkspaces.workspaces);
  });

  it('should select devWorkspaces error', () => {
    const result = selectDevWorkspacesError(mockState);
    expect(result).toEqual('Something went wrong');
  });

  it('should select running devWorkspaces', () => {
    const result = selectRunningDevWorkspaces(mockState);
    expect(result).toEqual([
      { metadata: { uid: '1' }, status: { phase: DevWorkspaceStatus.RUNNING } },
      { metadata: { uid: '3' }, status: { phase: DevWorkspaceStatus.STARTING } },
    ]);
  });

  it('should determine if running devWorkspaces limit is exceeded', () => {
    const result = selectRunningDevWorkspacesLimitExceeded(mockState);
    expect(result).toBe(true);
  });

  it('should select started workspaces', () => {
    const result = selectStartedWorkspaces(mockState);
    expect(result).toEqual({ '1': '1' });
  });

  it('should select devWorkspace warnings', () => {
    const result = selectDevWorkspaceWarnings(mockState);
    expect(result).toEqual({ '2': 'This is a warning' });
  });
});
