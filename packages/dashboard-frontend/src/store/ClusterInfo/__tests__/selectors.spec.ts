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
import { selectApplications, selectClusterInfoError } from '@/store/ClusterInfo/selectors';

describe('ClusterInfo', () => {
  const applications = [
    {
      title: 'App1',
      url: 'my/app/1',
      icon: 'my/app/1/logo',
    },
  ];
  const mockState = {
    clusterInfo: {
      clusterInfo: {
        applications,
      },
      isLoading: false,
      error: 'Something unexpected',
    },
  } as Partial<RootState> as RootState;

  it('should return all applications', () => {
    const selectedApps = selectApplications(mockState);
    expect(selectedApps).toEqual(applications);
  });

  it('should return an empty array if there are no applications', () => {
    const stateWithoutApps = {
      ...mockState,
      clusterInfo: {
        clusterInfo: {
          applications: undefined,
        } as unknown,
      },
    } as RootState;
    const selectedApps = selectApplications(stateWithoutApps);
    expect(selectedApps).toEqual([]);
  });

  it('should return an error', () => {
    const selectedError = selectClusterInfoError(mockState);
    expect(selectedError).toEqual('Something unexpected');
  });
});
