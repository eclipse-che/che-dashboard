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

import { RootState } from '@/store';
import {
  selectClusterConfigError,
  selectCurrentArchitecture,
  selectDashboardFavicon,
  selectDashboardWarning,
  selectRunningWorkspacesLimit,
} from '@/store/ClusterConfig/selectors';

describe('ClusterConfig Selectors', () => {
  const mockState = {
    clusterConfig: {
      clusterConfig: {
        allWorkspacesLimit: -1,
        dashboardWarning: 'A warning message',
        runningWorkspacesLimit: 1,
        dashboardFavicon: {
          base64data: 'base64data',
          mediatype: 'image/png',
        },
        currentArchitecture: 'amd64',
      },
      isLoading: false,
      error: 'Something unexpected',
    },
  } as RootState;

  it('should select dashboard warning', () => {
    const result = selectDashboardWarning(mockState);
    expect(result).toEqual('A warning message');
  });

  it('should return empty string if dashboard warning is not available', () => {
    const stateWithoutWarning = {
      ...mockState,
      clusterConfig: {
        clusterConfig: {
          dashboardWarning: undefined,
        },
      },
    } as RootState;
    const result = selectDashboardWarning(stateWithoutWarning);
    expect(result).toEqual('');
  });

  it('should select running workspaces limit', () => {
    const result = selectRunningWorkspacesLimit(mockState);
    expect(result).toEqual(1);
  });

  it('should return default value for running workspaces limit if not set', () => {
    const stateWithoutLimit = {
      ...mockState,
      clusterConfig: { ...mockState.clusterConfig, runningWorkspacesLimit: undefined },
    } as RootState;
    const result = selectRunningWorkspacesLimit(stateWithoutLimit);
    expect(result).toEqual(1); // Assuming 1 is the default value
  });

  it('should select cluster config error', () => {
    const result = selectClusterConfigError(mockState);
    expect(result).toEqual('Something unexpected');
  });

  it('should return undefined if cluster config error is not available', () => {
    const stateWithoutError = {
      ...mockState,
      clusterConfig: { ...mockState.clusterConfig, error: undefined },
    } as RootState;
    const result = selectClusterConfigError(stateWithoutError);
    expect(result).toBeUndefined();
  });

  it('should select dashboard favicon', () => {
    const result = selectDashboardFavicon(mockState);
    expect(result).toEqual({
      base64data: 'base64data',
      mediatype: 'image/png',
    });
  });

  it('should return cluster architecture', () => {
    const result = selectCurrentArchitecture({
      clusterConfig: {
        clusterConfig: {
          currentArchitecture: 'amd64',
        },
      },
    } as RootState);
    expect(result).toEqual('amd64');
  });

  it('should return "unknown" if current architecture is not set', () => {
    const result = selectCurrentArchitecture({
      clusterConfig: {
        clusterConfig: {},
      },
    } as RootState);
    expect(result).toEqual('unknown');
  });
});
