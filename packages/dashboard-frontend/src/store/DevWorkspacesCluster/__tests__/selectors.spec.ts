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
import { selectRunningDevWorkspacesClusterLimitExceeded } from '@/store/DevWorkspacesCluster/selectors';

describe('DevWorkspacesCluster Selectors', () => {
  const mockState = {
    devWorkspacesCluster: {
      isRunningDevWorkspacesClusterLimitExceeded: true,
    },
  } as RootState;

  it('should select if running dev workspaces cluster limit is exceeded', () => {
    const result = selectRunningDevWorkspacesClusterLimitExceeded(mockState);
    expect(result).toBe(true);
  });

  it('should return false if running dev workspaces cluster limit is not exceeded', () => {
    const stateWithLimitNotExceeded = {
      devWorkspacesCluster: {
        isRunningDevWorkspacesClusterLimitExceeded: false,
      },
    } as RootState;
    const result = selectRunningDevWorkspacesClusterLimitExceeded(stateWithLimitNotExceeded);
    expect(result).toBe(false);
  });
});
