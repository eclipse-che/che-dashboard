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
  checkRunningDevWorkspacesClusterLimitExceeded,
  RunningDevWorkspacesClusterLimitExceededError,
  throwRunningDevWorkspacesClusterLimitExceededError,
} from '@/store/DevWorkspacesCluster';

const mockSelectRunningDevWorkspacesClusterLimitExceeded = jest.fn();
jest.mock('@/store/DevWorkspacesCluster/selectors', () => ({
  selectRunningDevWorkspacesClusterLimitExceeded: () =>
    mockSelectRunningDevWorkspacesClusterLimitExceeded(),
}));

describe('DevWorkspacesCluster index', () => {
  describe('RunningDevWorkspacesClusterLimitExceededError', () => {
    it('should create an error with the correct message and name', () => {
      const error = new RunningDevWorkspacesClusterLimitExceededError('Test message');
      expect(error.message).toBe('Test message');
      expect(error.name).toBe('RunningDevWorkspacesClusterLimitExceededError');
    });
  });

  describe('checkRunningDevWorkspacesClusterLimitExceeded', () => {
    it('should not throw an error if the limit is not exceeded', () => {
      mockSelectRunningDevWorkspacesClusterLimitExceeded.mockReturnValue(false);
      const mockState = {} as RootState;

      expect(() => checkRunningDevWorkspacesClusterLimitExceeded(mockState)).not.toThrow();
    });

    it('should throw an error if the limit is exceeded', () => {
      mockSelectRunningDevWorkspacesClusterLimitExceeded.mockReturnValue(true);
      const mockState = {} as RootState;

      expect(() => checkRunningDevWorkspacesClusterLimitExceeded(mockState)).toThrow(
        RunningDevWorkspacesClusterLimitExceededError,
      );
    });
  });

  describe('throwRunningDevWorkspacesClusterLimitExceededError', () => {
    it('should throw RunningDevWorkspacesClusterLimitExceededError with the correct message', () => {
      expect(() => throwRunningDevWorkspacesClusterLimitExceededError()).toThrow(
        new RunningDevWorkspacesClusterLimitExceededError(
          'Exceeded the cluster limit for running DevWorkspaces',
        ),
      );
    });
  });
});
