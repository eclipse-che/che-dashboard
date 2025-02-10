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

import { api } from '@eclipse-che/common';
import * as mockClient from '@kubernetes/client-node';
import { CoreV1Api, V1Secret } from '@kubernetes/client-node';
import { IncomingMessage } from 'http';

import { GitConfigApiService } from '..';

jest.mock('@/devworkspaceClient/services/helpers/retryableExec.ts');

const namespace = 'user-che';
const responseBody = {
  data: {
    gitconfig: btoa(`[user]\n\tname = User One\n\temail = user-1@che`),
  },
};

describe('Gitconfig API', () => {
  let gitConfigApiService: GitConfigApiService;

  describe('secret not found', () => {
    const stubCoreV1Api = {
      createNamespacedSecret: () => {
        return Promise.resolve({
          body: responseBody as V1Secret,
          response: {} as IncomingMessage,
        });
      },
      readNamespacedSecret: () => {
        return Promise.reject({
          body: {},
          response: {} as IncomingMessage,
          statusCode: 404,
          name: 'HttpError',
          message: 'Not Found',
        });
      },
    } as unknown as CoreV1Api;
    const spyCreateNamespacedSecret = jest.spyOn(stubCoreV1Api, 'createNamespacedSecret');

    beforeEach(() => {
      const { KubeConfig } = mockClient;
      const kubeConfig = new KubeConfig();
      kubeConfig.makeApiClient = jest.fn().mockImplementation(() => stubCoreV1Api);

      gitConfigApiService = new GitConfigApiService(kubeConfig);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should create the secret and return gitconfig', async () => {
      const resp = await gitConfigApiService.read(namespace);

      expect(resp.gitconfig).toStrictEqual({
        user: {
          name: 'User One',
          email: 'user-1@che',
        },
      });

      expect(spyCreateNamespacedSecret).toHaveBeenCalledTimes(1);
      expect(spyCreateNamespacedSecret).toHaveBeenCalledWith(namespace, {
        data: {
          gitconfig: btoa(`[user]
name=""
email=""
`),
        },
        metadata: {
          annotations: {
            'controller.devfile.io/mount-as': 'subpath',
            'controller.devfile.io/mount-path': '/etc/',
          },
          labels: {
            'controller.devfile.io/mount-to-devworkspace': 'true',
            'controller.devfile.io/watch-secret': 'true',
          },
          name: 'devworkspace-gitconfig-automaunt-secret',
          namespace,
        },
      });
    });
  });

  describe('secret found', () => {
    const stubCoreV1Api = {
      readNamespacedSecret: () => {
        return Promise.resolve({
          body: responseBody as V1Secret,
          response: {} as IncomingMessage,
        });
      },
      patchNamespacedSecret: () => {
        return Promise.resolve({
          body: responseBody as V1Secret,
          response: {} as IncomingMessage,
        });
      },
    } as unknown as CoreV1Api;
    const spyReadNamespacedSecret = jest.spyOn(stubCoreV1Api, 'readNamespacedSecret');
    const spyPatchNamespacedSecret = jest.spyOn(stubCoreV1Api, 'patchNamespacedSecret');

    beforeEach(() => {
      const { KubeConfig } = mockClient;
      const kubeConfig = new KubeConfig();
      kubeConfig.makeApiClient = jest.fn().mockImplementation(() => stubCoreV1Api);

      gitConfigApiService = new GitConfigApiService(kubeConfig);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('reading gitconfig', () => {
      it('should return gitconfig', async () => {
        const resp = await gitConfigApiService.read(namespace);

        expect(resp.gitconfig).toStrictEqual(
          expect.objectContaining({
            user: expect.objectContaining({
              name: 'User One',
              email: 'user-1@che',
            }),
          }),
        );

        expect(spyReadNamespacedSecret).toHaveBeenCalledTimes(1);
        expect(spyPatchNamespacedSecret).not.toHaveBeenCalled();
      });

      it('should throw', async () => {
        spyReadNamespacedSecret.mockRejectedValueOnce('404 not found');

        try {
          await gitConfigApiService.read(namespace);

          // should not reach here
          expect(false).toBeTruthy();
        } catch (e) {
          expect((e as Error).message).toBe(
            'Unable to read gitconfig in the namespace "user-che": 404 not found',
          );
        }

        expect(spyReadNamespacedSecret).toHaveBeenCalledTimes(1);
        expect(spyPatchNamespacedSecret).not.toHaveBeenCalled();
      });
    });

    describe('patching gitconfig', () => {
      it('should patch and return gitconfig', async () => {
        const newGitConfig = {
          gitconfig: {
            user: {
              email: 'user-2@che',
              name: 'User Two',
            },
          },
        } as api.IGitConfig;
        await gitConfigApiService.patch(namespace, newGitConfig);

        expect(spyReadNamespacedSecret).toHaveBeenCalledTimes(1);
        expect(spyPatchNamespacedSecret).toHaveBeenCalledTimes(1);
        expect(spyPatchNamespacedSecret).toHaveBeenCalledWith(
          'devworkspace-gitconfig-automaunt-secret',
          'user-che',
          {
            data: {
              gitconfig: btoa(`[user]
email="user-2@che"
name="User Two"
`),
            },
          },
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          { headers: { 'content-type': 'application/strategic-merge-patch+json' } },
        );
      });

      it('should throw when can`t read the secret', async () => {
        spyReadNamespacedSecret.mockRejectedValueOnce('404 not found');

        const newGitConfig = {
          gitconfig: {
            user: {
              email: 'user-2@che',
              name: 'User Two',
            },
          },
        } as api.IGitConfig;

        try {
          await gitConfigApiService.patch(namespace, newGitConfig);

          // should not reach here
          expect(false).toBeTruthy();
        } catch (e) {
          expect((e as Error).message).toBe(
            'Unable to update gitconfig in the namespace "user-che".',
          );
        }

        expect(spyReadNamespacedSecret).toHaveBeenCalledTimes(1);
        expect(spyPatchNamespacedSecret).toHaveBeenCalledTimes(0);
      });

      it('should throw when failed to patch the secret', async () => {
        spyPatchNamespacedSecret.mockRejectedValueOnce('some error');

        const newGitConfig = {
          gitconfig: {
            user: {
              email: 'user-2@che',
              name: 'User Two',
            },
          },
        } as api.IGitConfig;

        try {
          await gitConfigApiService.patch(namespace, newGitConfig);

          // should not reach here
          expect(false).toBeTruthy();
        } catch (e) {
          expect((e as Error).message).toBe(
            'Unable to update gitconfig in the namespace "user-che": some error',
          );
        }

        expect(spyReadNamespacedSecret).toHaveBeenCalledTimes(1);
        expect(spyPatchNamespacedSecret).toHaveBeenCalledTimes(1);
      });

      it('should throw when conflict detected', async () => {
        spyReadNamespacedSecret.mockResolvedValueOnce({
          body: {
            metadata: {
              resourceVersion: '2',
            },
            data: {
              gitconfig: btoa(`[user]
name="User Two"
email="user-2@che"
`),
            },
          } as V1Secret,
          response: {} as IncomingMessage,
        });

        const newGitConfig = {
          gitconfig: {
            user: {
              email: 'user-2@che',
              name: 'User Two',
            },
          },
          resourceVersion: '1',
        } as api.IGitConfig;

        let isPatched = false;
        let errorMessage = '';

        try {
          await gitConfigApiService.patch(namespace, newGitConfig);
          isPatched = true;
        } catch (e: unknown) {
          errorMessage = (e as Error).message;
        }

        expect(isPatched).toBe(false);
        expect(errorMessage).toBe(
          'Conflict detected. The gitconfig was modified in the namespace "user-che".',
        );

        expect(spyReadNamespacedSecret).toHaveBeenCalledTimes(1);
        expect(spyPatchNamespacedSecret).toHaveBeenCalledTimes(0);
      });
    });
  });
});
