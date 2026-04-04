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

/* eslint-disable @typescript-eslint/no-unused-vars */

import * as mockClient from '@kubernetes/client-node';
import { CoreV1Api, V1Secret, V1SecretList } from '@kubernetes/client-node';

import { AiProviderKeyApiService } from '@/devworkspaceClient/services/aiProviderKeyApi';

jest.mock('@/devworkspaceClient/services/helpers/retryableExec.ts');

const namespace = 'user-che';
const providerId = 'google/gemini';
const sanitizedId = 'google-gemini';
const envVarName = 'GEMINI_API_KEY';
// Secret name is derived from envVarName: "ai-provider-" + envVarName.toLowerCase().replace(/_/g, '-')
const secretName = 'ai-provider-gemini-api-key';

const AI_PROVIDER_ID_LABEL = 'che.eclipse.org/ai-provider-id';
const MOUNT_TO_DEVWORKSPACE_LABEL = 'controller.devfile.io/mount-to-devworkspace';
const WATCH_SECRET_LABEL = 'controller.devfile.io/watch-secret';
const MOUNT_AS_ANNOTATION = 'controller.devfile.io/mount-as';

describe('AI Provider Key API Service', () => {
  let service: AiProviderKeyApiService;

  const stubCoreV1Api = {
    listNamespacedSecret: () => {
      return Promise.resolve({
        items: [
          {
            metadata: {
              name: secretName,
              labels: {
                [MOUNT_TO_DEVWORKSPACE_LABEL]: 'true',
                [WATCH_SECRET_LABEL]: 'true',
                [AI_PROVIDER_ID_LABEL]: sanitizedId,
              },
              annotations: {
                [MOUNT_AS_ANNOTATION]: 'env',
              },
            },
            data: {
              [envVarName]: Buffer.from('test-key').toString('base64'),
            },
          } as V1Secret,
        ],
      } as V1SecretList);
    },
    createNamespacedSecret: () => {
      return Promise.resolve({} as V1Secret);
    },
    replaceNamespacedSecret: () => {
      return Promise.resolve({} as V1Secret);
    },
    deleteNamespacedSecret: () => {
      return Promise.resolve(undefined);
    },
  } as unknown as CoreV1Api;

  const spyListNamespacedSecret = jest.spyOn(stubCoreV1Api, 'listNamespacedSecret');
  const spyCreateNamespacedSecret = jest.spyOn(stubCoreV1Api, 'createNamespacedSecret');
  const spyReplaceNamespacedSecret = jest.spyOn(stubCoreV1Api, 'replaceNamespacedSecret');
  const spyDeleteNamespacedSecret = jest.spyOn(stubCoreV1Api, 'deleteNamespacedSecret');

  beforeEach(() => {
    const { KubeConfig } = mockClient;
    const kubeConfig = new KubeConfig();
    kubeConfig.makeApiClient = jest.fn().mockImplementation(_api => stubCoreV1Api);
    service = new AiProviderKeyApiService(kubeConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listProviderIdsWithKey', () => {
    it('should return provider IDs from labeled secrets', async () => {
      spyListNamespacedSecret.mockResolvedValueOnce({
        items: [
          {
            metadata: {
              name: secretName,
              labels: {
                [MOUNT_TO_DEVWORKSPACE_LABEL]: 'true',
                [WATCH_SECRET_LABEL]: 'true',
                [AI_PROVIDER_ID_LABEL]: sanitizedId,
              },
            },
          } as V1Secret,
        ],
      } as V1SecretList);

      const result = await service.listProviderIdsWithKey(namespace);

      expect(spyListNamespacedSecret).toHaveBeenCalledWith({
        namespace,
        labelSelector: AI_PROVIDER_ID_LABEL,
      });
      expect(result).toEqual([sanitizedId]);
    });

    it('should return empty array when no labeled secrets found', async () => {
      spyListNamespacedSecret.mockResolvedValueOnce({ items: [] } as V1SecretList);

      const result = await service.listProviderIdsWithKey(namespace);

      expect(result).toEqual([]);
    });

    it('should make exactly one API call', async () => {
      spyListNamespacedSecret.mockResolvedValueOnce({ items: [] } as V1SecretList);

      await service.listProviderIdsWithKey(namespace);

      expect(spyListNamespacedSecret).toHaveBeenCalledTimes(1);
    });

    it('should throw error when listing fails', async () => {
      spyListNamespacedSecret.mockImplementationOnce(() => {
        throw new Error('Forbidden');
      });

      await expect(service.listProviderIdsWithKey(namespace)).rejects.toThrow(
        `Unable to list AI provider keys in the namespace "${namespace}": Forbidden`,
      );
    });
  });

  describe('createOrReplace', () => {
    it('should create a new secret when none exists', async () => {
      await service.createOrReplace(namespace, providerId, 'new-api-key', envVarName);

      expect(spyCreateNamespacedSecret).toHaveBeenCalledWith(
        expect.objectContaining({
          namespace,
          body: expect.objectContaining({
            metadata: expect.objectContaining({
              name: secretName,
              labels: expect.objectContaining({
                [MOUNT_TO_DEVWORKSPACE_LABEL]: 'true',
                [WATCH_SECRET_LABEL]: 'true',
                [AI_PROVIDER_ID_LABEL]: sanitizedId,
              }),
              annotations: expect.objectContaining({
                [MOUNT_AS_ANNOTATION]: 'env',
              }),
            }),
            data: expect.objectContaining({
              [envVarName]: 'new-api-key',
            }),
          }),
        }),
      );
      expect(spyReplaceNamespacedSecret).not.toHaveBeenCalled();
    });

    it('should fall back to replace when create returns 409 Conflict', async () => {
      const conflictError = Object.assign(new Error('Conflict'), {
        headers: {},
        body: { message: 'already exists' },
        code: 409,
      });
      spyCreateNamespacedSecret.mockRejectedValueOnce(conflictError);

      await service.createOrReplace(namespace, providerId, 'new-api-key', envVarName);

      expect(spyCreateNamespacedSecret).toHaveBeenCalled();
      expect(spyReplaceNamespacedSecret).toHaveBeenCalledWith(
        expect.objectContaining({
          name: secretName,
          namespace,
          body: expect.objectContaining({
            metadata: expect.objectContaining({
              name: secretName,
              labels: expect.objectContaining({
                [MOUNT_TO_DEVWORKSPACE_LABEL]: 'true',
                [WATCH_SECRET_LABEL]: 'true',
                [AI_PROVIDER_ID_LABEL]: sanitizedId,
              }),
              annotations: expect.objectContaining({
                [MOUNT_AS_ANNOTATION]: 'env',
              }),
            }),
            data: expect.objectContaining({
              [envVarName]: 'new-api-key',
            }),
          }),
        }),
      );
    });

    it('should throw error when replace fails after 409', async () => {
      const conflictError = Object.assign(new Error('Conflict'), {
        headers: {},
        body: { message: 'already exists' },
        code: 409,
      });
      spyCreateNamespacedSecret.mockRejectedValueOnce(conflictError);
      spyReplaceNamespacedSecret.mockRejectedValueOnce(new Error('Internal Server Error'));

      await expect(
        service.createOrReplace(namespace, providerId, 'key', envVarName),
      ).rejects.toThrow(`Unable to replace AI provider key for "${providerId}"`);
    });

    it('should throw error when create fails with non-409 error', async () => {
      spyCreateNamespacedSecret.mockRejectedValueOnce(new Error('Forbidden'));

      await expect(
        service.createOrReplace(namespace, providerId, 'key', envVarName),
      ).rejects.toThrow(`Unable to create AI provider key for "${providerId}"`);
    });
  });

  describe('delete', () => {
    it('should find the secret by provider label and delete it', async () => {
      await service.delete(namespace, providerId);

      expect(spyListNamespacedSecret).toHaveBeenCalledWith({
        namespace,
        labelSelector: `${AI_PROVIDER_ID_LABEL}=${sanitizedId}`,
      });
      expect(spyDeleteNamespacedSecret).toHaveBeenCalledWith({
        name: secretName,
        namespace,
      });
    });

    it('should do nothing when no secret is found', async () => {
      spyListNamespacedSecret.mockResolvedValueOnce({ items: [] } as V1SecretList);

      await service.delete(namespace, providerId);

      expect(spyDeleteNamespacedSecret).not.toHaveBeenCalled();
    });

    it('should throw error when listing fails during delete', async () => {
      spyListNamespacedSecret.mockImplementationOnce(() => {
        throw new Error('Not Found');
      });

      await expect(service.delete(namespace, providerId)).rejects.toThrow(
        `Unable to delete AI provider key for "${providerId}" in the namespace "${namespace}": Not Found`,
      );
    });

    it('should throw error when deletion fails', async () => {
      spyDeleteNamespacedSecret.mockImplementationOnce(() => {
        throw new Error('Forbidden');
      });

      await expect(service.delete(namespace, providerId)).rejects.toThrow(
        `Unable to delete AI provider key for "${providerId}" in the namespace "${namespace}": Forbidden`,
      );
    });
  });
});
