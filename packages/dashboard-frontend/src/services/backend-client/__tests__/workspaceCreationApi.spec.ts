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

import common, { AxiosError } from 'axios';

import {
  createWorkspaceViaEndpoint,
  WorkspaceCreationParams,
} from '@/services/backend-client/workspaceCreationApi';
import devfileApi from '@/services/devfileApi';

jest.mock('@/services/axios-wrapper/axiosWrapper', () => ({
  AxiosWrapper: {
    createToRetryMissedBearerTokenError: jest.fn().mockReturnValue({
      post: jest.fn(),
    }),
  },
}));

import { AxiosWrapper } from '@/services/axios-wrapper/axiosWrapper';

describe('workspaceCreationApi', () => {
  let mockPost: jest.Mock;

  beforeEach(() => {
    mockPost = (AxiosWrapper.createToRetryMissedBearerTokenError() as any).post;
    mockPost.mockReset();
  });

  describe('createWorkspaceViaEndpoint', () => {
    const namespace = 'user-che';
    const params: WorkspaceCreationParams = {
      devfileContent: 'schemaVersion: 2.2.0\nmetadata:\n  name: my-workspace\n',
      editorPath: 'che-incubator/che-code/latest',
      gitBranch: 'main',
      remoteUrl: 'https://github.com/example/repo',
    };

    const devWorkspace: devfileApi.DevWorkspace = {
      apiVersion: 'workspace.devfile.io/v1alpha2',
      kind: 'DevWorkspace',
      metadata: {
        name: 'my-workspace',
        namespace,
      },
      spec: {
        started: true,
        template: {},
      },
    } as devfileApi.DevWorkspace;

    it('should call the workspace-creation endpoint and return a DevWorkspace on success', async () => {
      mockPost.mockResolvedValueOnce({ data: devWorkspace });

      const result = await createWorkspaceViaEndpoint(namespace, params);

      expect(AxiosWrapper.createToRetryMissedBearerTokenError).toHaveBeenCalled();
      expect(mockPost).toHaveBeenCalledWith(
        `/dashboard/api/namespace/${namespace}/workspace-creation`,
        params,
      );
      expect(result).toEqual(devWorkspace);
    });

    it('should throw a wrapped error when the request fails', async () => {
      mockPost.mockRejectedValueOnce({
        message: 'Network Error',
      });

      let errorMessage: string | undefined;
      try {
        await createWorkspaceViaEndpoint(namespace, params);
      } catch (err) {
        errorMessage = (err as Error).message;
      }

      expect(errorMessage).toContain('Failed to create workspace via endpoint.');
      expect(errorMessage).toContain('Network Error');
    });

    it('should pass partial params correctly', async () => {
      const partialParams: WorkspaceCreationParams = {
        devfileContent: 'schemaVersion: 2.2.0\n',
      };
      mockPost.mockResolvedValueOnce({ data: devWorkspace });

      await createWorkspaceViaEndpoint(namespace, partialParams);

      expect(mockPost).toHaveBeenCalledWith(
        `/dashboard/api/namespace/${namespace}/workspace-creation`,
        partialParams,
      );
    });
  });
});
