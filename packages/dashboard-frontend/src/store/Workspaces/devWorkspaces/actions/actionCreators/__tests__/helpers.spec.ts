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

import { helpers } from '@eclipse-che/common';

import { container } from '@/inversify.config';
import devfileApi, * as devfileApiService from '@/services/devfileApi';
import { devWorkspaceKind } from '@/services/devfileApi/devWorkspace';
import { compareStringsAsNumbers } from '@/services/helpers/resourceVersion';
import {
  DEVWORKSPACE_NEXT_START_ANNOTATION,
  DevWorkspaceClient,
} from '@/services/workspace-client/devworkspace/devWorkspaceClient';
import { RootState } from '@/store';
import { selectRunningWorkspacesLimit } from '@/store/ClusterConfig/selectors';
import { RunningWorkspacesExceededError } from '@/store/Workspaces/devWorkspaces';
import {
  checkDevWorkspaceNextStartAnnotation,
  checkRunningWorkspacesLimit,
  getDevWorkspaceClient,
  getWarningFromResponse,
  shouldUpdateDevWorkspace,
} from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers';
import { selectRunningDevWorkspacesLimitExceeded } from '@/store/Workspaces/devWorkspaces/selectors';

jest.mock('@eclipse-che/common');
jest.mock('@/inversify.config');
jest.mock('@/services/devfileApi', () => ({
  ...jest.requireActual('@/services/devfileApi'),
  isDevWorkspace: jest.fn(),
}));
jest.mock('@/services/helpers/resourceVersion');
jest.mock('@/store/ClusterConfig/selectors');
jest.mock('@/store/Workspaces/devWorkspaces/selectors');

describe('devWorkspaces, helpers', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWarningFromResponse', () => {
    it('should return undefined if error does not include Axios response', () => {
      const error = new Error('Test error');
      (helpers.errors.includesAxiosResponse as unknown as jest.Mock).mockReturnValue(false);

      const result = getWarningFromResponse(error);
      expect(result).toBeUndefined();
    });

    it('should return provider-specific warning if provider is GitHub', () => {
      const error = {
        response: {
          data: {
            attributes: {
              provider: 'github',
            },
            message: 'GitHub error message',
          },
        },
      };
      (helpers.errors.includesAxiosResponse as unknown as jest.Mock).mockReturnValue(true);

      const result = getWarningFromResponse(error);
      expect(result).toBe(
        "GitHub might not be operational, please check the provider's status page.",
      );
    });

    it('should return provider-specific warning if provider is Gitlab', () => {
      const error = {
        response: {
          data: {
            attributes: {
              provider: 'gitlab',
            },
            message: 'Gitlab error message',
          },
        },
      };
      (helpers.errors.includesAxiosResponse as unknown as jest.Mock).mockReturnValue(true);

      const result = getWarningFromResponse(error);
      expect(result).toBe(
        "Gitlab might not be operational, please check the provider's status page.",
      );
    });

    it('should return generic message if provider is unknown', () => {
      const error = {
        response: {
          data: {
            attributes: {
              provider: 'unknown',
            },
            message: 'Unknown provider error',
          },
        },
      };
      (helpers.errors.includesAxiosResponse as unknown as jest.Mock).mockReturnValue(true);

      const result = getWarningFromResponse(error);
      expect(result).toBe('Unknown provider error');
    });

    it('should return message from response data if attributes are undefined', () => {
      const error = {
        response: {
          data: {
            message: 'Error message without attributes',
          },
        },
      };
      (helpers.errors.includesAxiosResponse as unknown as jest.Mock).mockReturnValue(true);

      const result = getWarningFromResponse(error);
      expect(result).toBe('Error message without attributes');
    });
  });

  describe('checkDevWorkspaceNextStartAnnotation', () => {
    let devWorkspaceClient: DevWorkspaceClient;
    let workspace: devfileApi.DevWorkspace;

    beforeEach(() => {
      devWorkspaceClient = {
        update: jest.fn().mockResolvedValue({}),
      } as unknown as DevWorkspaceClient;

      workspace = {
        metadata: {
          annotations: {},
        },
        spec: {
          template: {},
          started: false,
        },
      } as devfileApi.DevWorkspace;
    });

    it('should not update workspace if annotation is not present', async () => {
      await checkDevWorkspaceNextStartAnnotation(devWorkspaceClient, workspace);
      expect(devWorkspaceClient.update).not.toHaveBeenCalled();
    });

    it('should update workspace when annotation is present and valid', async () => {
      const storedDevWorkspace = {
        kind: devWorkspaceKind,
        spec: {
          template: { components: [] },
        },
      };
      workspace.metadata.annotations![DEVWORKSPACE_NEXT_START_ANNOTATION] =
        JSON.stringify(storedDevWorkspace);
      jest.spyOn(devfileApiService, 'isDevWorkspace').mockReturnValueOnce(true);

      await checkDevWorkspaceNextStartAnnotation(devWorkspaceClient, workspace);

      expect(devWorkspaceClient.update).toHaveBeenCalledWith(workspace);
      expect(workspace.spec.template).toEqual(storedDevWorkspace.spec.template);
      expect(workspace.spec.started).toBe(false);
      expect(workspace.metadata.annotations![DEVWORKSPACE_NEXT_START_ANNOTATION]).toBeUndefined();
    });

    it('should throw error if storedDevWorkspace is invalid', async () => {
      const storedDevWorkspace = {};
      workspace.metadata.annotations![DEVWORKSPACE_NEXT_START_ANNOTATION] =
        JSON.stringify(storedDevWorkspace);
      jest.spyOn(devfileApiService, 'isDevWorkspace').mockReturnValueOnce(false);
      console.error = jest.fn();

      await expect(
        checkDevWorkspaceNextStartAnnotation(devWorkspaceClient, workspace),
      ).rejects.toThrow(
        'Unexpected error happened. Please check the Console tab of Developer tools.',
      );

      expect(devWorkspaceClient.update).not.toHaveBeenCalled();
    });
  });

  describe('checkRunningWorkspacesLimit', () => {
    it('should not throw error if running limit is not exceeded', () => {
      const state = {} as RootState;
      (selectRunningDevWorkspacesLimitExceeded as unknown as jest.Mock).mockReturnValue(false);

      expect(() => checkRunningWorkspacesLimit(state)).not.toThrow();
    });

    it('should throw RunningWorkspacesExceededError if running limit is exceeded', () => {
      const state = {} as RootState;
      (selectRunningDevWorkspacesLimitExceeded as unknown as jest.Mock).mockReturnValue(true);
      (selectRunningWorkspacesLimit as unknown as jest.Mock).mockReturnValue(2);

      expect(() => checkRunningWorkspacesLimit(state)).toThrow(RunningWorkspacesExceededError);
    });
  });

  describe('getDevWorkspaceClient', () => {
    it('should return DevWorkspaceClient instance from container', () => {
      const mockClient = {};
      (container.get as jest.Mock).mockReturnValue(mockClient);

      const result = getDevWorkspaceClient();

      expect(container.get).toHaveBeenCalledWith(DevWorkspaceClient);
      expect(result).toBe(mockClient);
    });
  });

  describe('shouldUpdateDevWorkspace', () => {
    it('should return false if resourceVersion is undefined', () => {
      const prevDevWorkspace = { metadata: {} } as devfileApi.DevWorkspace;
      const devWorkspace = { metadata: {} } as devfileApi.DevWorkspace;

      const result = shouldUpdateDevWorkspace(prevDevWorkspace, devWorkspace);
      expect(result).toBe(false);
    });

    it('should return true if prevResourceVersion is undefined', () => {
      const prevDevWorkspace = { metadata: {} } as devfileApi.DevWorkspace;
      const devWorkspace = { metadata: { resourceVersion: '2' } } as devfileApi.DevWorkspace;

      const result = shouldUpdateDevWorkspace(prevDevWorkspace, devWorkspace);
      expect(result).toBe(true);
    });

    it('should compare resource versions and return true if newer', () => {
      const prevDevWorkspace = { metadata: { resourceVersion: '1' } } as devfileApi.DevWorkspace;
      const devWorkspace = { metadata: { resourceVersion: '2' } } as devfileApi.DevWorkspace;
      (compareStringsAsNumbers as jest.Mock).mockReturnValue(-1);

      const result = shouldUpdateDevWorkspace(prevDevWorkspace, devWorkspace);
      expect(result).toBe(true);
      expect(compareStringsAsNumbers).toHaveBeenCalledWith('1', '2');
    });

    it('should compare resource versions and return false if older or equal', () => {
      const prevDevWorkspace = { metadata: { resourceVersion: '2' } } as devfileApi.DevWorkspace;
      const devWorkspace = { metadata: { resourceVersion: '2' } } as devfileApi.DevWorkspace;
      (compareStringsAsNumbers as jest.Mock).mockReturnValue(0);

      const result = shouldUpdateDevWorkspace(prevDevWorkspace, devWorkspace);
      expect(result).toBe(false);
      expect(compareStringsAsNumbers).toHaveBeenCalledWith('2', '2');
    });
  });
});
