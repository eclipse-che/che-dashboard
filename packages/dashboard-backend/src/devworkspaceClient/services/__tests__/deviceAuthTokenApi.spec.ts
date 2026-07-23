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

import { api } from '@eclipse-che/common';
import * as mockClient from '@kubernetes/client-node';
import { CoreV1Api, V1Secret, V1SecretList } from '@kubernetes/client-node';

import { GitHubDeviceAuthTokenApiService } from '@/devworkspaceClient/services/deviceAuthTokenApi';

jest.mock('@/devworkspaceClient/services/helpers/retryableExec');

const namespace = 'user-che';
const tokenName = 'device-authentication-secret-abc12';
const resourceVersion = 'rv-123';

const DEVICE_AUTH_LABEL = 'che.eclipse.org/device-authentication';
const DEVICE_AUTH_PROVIDER_LABEL = 'che.eclipse.org/device-authentication-provider';

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('DeviceAuthToken API Service', () => {
  let service: GitHubDeviceAuthTokenApiService;

  const stubCoreV1Api = {
    listNamespacedSecret: () => {
      return Promise.resolve({ items: [] } as V1SecretList);
    },
    readNamespacedSecret: () => {
      return Promise.resolve({
        metadata: {
          name: tokenName,
          resourceVersion,
          labels: { [DEVICE_AUTH_LABEL]: 'true' },
          creationTimestamp: new Date('2024-01-01'),
        },
      } as V1Secret);
    },
    deleteNamespacedSecret: () => {
      return Promise.resolve(undefined);
    },
  } as unknown as CoreV1Api;

  const spyListNamespacedSecret = jest.spyOn(stubCoreV1Api, 'listNamespacedSecret');
  const spyReadNamespacedSecret = jest.spyOn(stubCoreV1Api, 'readNamespacedSecret');
  const spyDeleteNamespacedSecret = jest.spyOn(stubCoreV1Api, 'deleteNamespacedSecret');

  beforeEach(() => {
    const { KubeConfig } = mockClient;
    const kubeConfig = new KubeConfig();
    kubeConfig.makeApiClient = jest.fn().mockImplementation(_api => stubCoreV1Api);
    service = new GitHubDeviceAuthTokenApiService(kubeConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listTokens', () => {
    it('should return tokens from labeled secrets', async () => {
      const creationTimestamp = new Date('2024-01-01');
      spyListNamespacedSecret.mockResolvedValueOnce({
        items: [
          {
            metadata: {
              name: tokenName,
              creationTimestamp,
              labels: { [DEVICE_AUTH_LABEL]: 'true' },
            },
          } as V1Secret,
        ],
      } as V1SecretList);

      const result = await service.listTokens(namespace);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe(tokenName);
      expect(result[0].provider).toBeUndefined();
      expect(result[0].creationTimestamp).toBe(creationTimestamp.toISOString());
      expect(spyListNamespacedSecret).toHaveBeenCalledWith({
        namespace,
        labelSelector: `${DEVICE_AUTH_LABEL}=true`,
      });
    });

    it('should include provider from label when present', async () => {
      spyListNamespacedSecret.mockResolvedValueOnce({
        items: [
          {
            metadata: {
              name: tokenName,
              labels: {
                [DEVICE_AUTH_LABEL]: 'true',
                [DEVICE_AUTH_PROVIDER_LABEL]: 'github',
              },
            },
          } as V1Secret,
        ],
      } as V1SecretList);

      const result = await service.listTokens(namespace);

      expect(result[0].provider).toBe('github');
    });

    it('should return an empty array when no labeled secrets exist', async () => {
      spyListNamespacedSecret.mockResolvedValueOnce({ items: [] } as V1SecretList);

      const result = await service.listTokens(namespace);

      expect(result).toHaveLength(0);
    });

    it('should filter out secrets without a name', async () => {
      spyListNamespacedSecret.mockResolvedValueOnce({
        items: [{ metadata: {} } as V1Secret],
      } as V1SecretList);

      const result = await service.listTokens(namespace);

      expect(result).toHaveLength(0);
    });

    it('should throw a formatted error when the API call fails', async () => {
      spyListNamespacedSecret.mockRejectedValueOnce(new Error('API error'));

      await expect(service.listTokens(namespace)).rejects.toThrow(
        `Unable to list Device Authentication tokens in the namespace "${namespace}"`,
      );
    });
  });

  describe('deleteToken', () => {
    it('should read and delete with resourceVersion precondition', async () => {
      await service.deleteToken(namespace, tokenName);

      expect(spyReadNamespacedSecret).toHaveBeenCalledWith({ name: tokenName, namespace });
      expect(spyDeleteNamespacedSecret).toHaveBeenCalledWith({
        name: tokenName,
        namespace,
        body: { preconditions: { resourceVersion } },
      });
    });

    it('should throw a distinct error when the secret does not carry the device-auth label', async () => {
      spyReadNamespacedSecret.mockResolvedValueOnce({
        metadata: { name: tokenName, labels: {} },
      } as V1Secret);

      await expect(service.deleteToken(namespace, tokenName)).rejects.toThrow(
        `Secret "${tokenName}" does not carry the`,
      );
      expect(spyDeleteNamespacedSecret).not.toHaveBeenCalled();
    });

    it('should throw a formatted error when the read API call fails', async () => {
      spyReadNamespacedSecret.mockRejectedValueOnce(new Error('API error'));

      await expect(service.deleteToken(namespace, tokenName)).rejects.toThrow(
        `Unable to delete Device Authentication token "${tokenName}" in the namespace "${namespace}"`,
      );
    });

    it('should throw a formatted error when the delete API call fails', async () => {
      spyDeleteNamespacedSecret.mockRejectedValueOnce(new Error('API error'));

      await expect(service.deleteToken(namespace, tokenName)).rejects.toThrow(
        `Unable to delete Device Authentication token "${tokenName}" in the namespace "${namespace}"`,
      );
    });

    it('should still delete the K8s secret when GitHub token revocation throws', async () => {
      process.env.CHE_GITHUB_OAUTH_CLIENT_ID = 'test-client-id';

      // Secret has a token in data field (base64 encoded)
      spyReadNamespacedSecret.mockResolvedValueOnce({
        metadata: {
          name: tokenName,
          resourceVersion,
          labels: { [DEVICE_AUTH_LABEL]: 'true' },
        },
        data: { token: Buffer.from('ghp_test_token').toString('base64') },
      } as V1Secret);

      // fetch (revocation call) throws a network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Should NOT throw — deleteNamespacedSecret must still be called
      await expect(service.deleteToken(namespace, tokenName)).resolves.toBeUndefined();
      expect(spyDeleteNamespacedSecret).toHaveBeenCalled();

      delete process.env.CHE_GITHUB_OAUTH_CLIENT_ID;
    });
  });

  describe('initiateDeviceAuth', () => {
    const origClientId = process.env.CHE_GITHUB_OAUTH_CLIENT_ID;
    beforeEach(() => {
      process.env.CHE_GITHUB_OAUTH_CLIENT_ID = 'test-client-id';
    });
    afterEach(() => {
      process.env.CHE_GITHUB_OAUTH_CLIENT_ID = origClientId;
      jest.clearAllMocks();
    });

    it('should return device code response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            device_code: 'dev-code-123',
            user_code: 'ABCD-1234',
            verification_uri: 'https://github.com/login/device',
            interval: 5,
          }),
      });

      const result = await service.initiateDeviceAuth();

      expect(result).toEqual({
        deviceCode: 'dev-code-123',
        userCode: 'ABCD-1234',
        verificationUri: 'https://github.com/login/device',
        interval: 5,
      });
    });

    it('should throw when CHE_GITHUB_OAUTH_CLIENT_ID is not set', async () => {
      delete process.env.CHE_GITHUB_OAUTH_CLIENT_ID;
      await expect(service.initiateDeviceAuth()).rejects.toThrow('CHE_GITHUB_OAUTH_CLIENT_ID');
    });

    it('should throw when GitHub returns an error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ error: 'invalid_client', error_description: 'Bad client' }),
      });
      await expect(service.initiateDeviceAuth()).rejects.toThrow('Bad client');
    });
  });

  describe('pollDeviceAuth', () => {
    const origClientId = process.env.CHE_GITHUB_OAUTH_CLIENT_ID;
    beforeEach(() => {
      process.env.CHE_GITHUB_OAUTH_CLIENT_ID = 'test-client-id';
      stubCoreV1Api.createNamespacedSecret = jest.fn().mockResolvedValue({
        metadata: {
          name: 'device-authentication-github',
          creationTimestamp: new Date('2024-01-01'),
        },
      });
      stubCoreV1Api.replaceNamespacedSecret = jest.fn().mockResolvedValue({
        metadata: {
          name: 'device-authentication-github',
          creationTimestamp: new Date('2024-01-01'),
        },
      });
    });
    afterEach(() => {
      process.env.CHE_GITHUB_OAUTH_CLIENT_ID = origClientId;
      jest.clearAllMocks();
    });

    it('should return pending when GitHub returns authorization_pending', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ error: 'authorization_pending' }),
      });
      const result = await service.pollDeviceAuth(namespace, 'dev-code-123');
      expect(result).toEqual({ status: 'pending' });
    });

    it('should return slow_down when GitHub returns slow_down', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ error: 'slow_down' }),
      });
      const result = await service.pollDeviceAuth(namespace, 'dev-code-123');
      expect(result).toEqual({ status: 'slow_down' });
    });

    it('should return expired when GitHub returns expired_token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ error: 'expired_token' }),
      });
      const result = await service.pollDeviceAuth(namespace, 'dev-code-123');
      expect(result).toEqual({ status: 'expired' });
    });

    it('should create K8s secret and return authorized on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ access_token: 'ghp_token123', token_type: 'bearer', scope: 'repo' }),
      });
      const result = await service.pollDeviceAuth(namespace, 'dev-code-123');
      expect(result.status).toBe('authorized');
      expect((result as { status: 'authorized'; token: api.DeviceAuthToken }).token.provider).toBe(
        'github',
      );
      expect(stubCoreV1Api.createNamespacedSecret).toHaveBeenCalled();
      expect(stubCoreV1Api.replaceNamespacedSecret).not.toHaveBeenCalled();
    });

    it('should replace existing K8s secret when reconnecting', async () => {
      const existingName = 'device-authentication-github';
      spyListNamespacedSecret.mockResolvedValueOnce({
        items: [{ metadata: { name: existingName } }],
      } as V1SecretList);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ access_token: 'ghp_new_token', token_type: 'bearer', scope: 'repo' }),
      });

      const result = await service.pollDeviceAuth(namespace, 'dev-code-456');

      expect(result.status).toBe('authorized');
      expect((result as { status: 'authorized'; token: api.DeviceAuthToken }).token.name).toBe(
        existingName,
      );
      expect(stubCoreV1Api.replaceNamespacedSecret).toHaveBeenCalledWith(
        expect.objectContaining({ name: existingName, namespace }),
      );
      expect(stubCoreV1Api.createNamespacedSecret).not.toHaveBeenCalled();
    });

    it('should return error when GitHub returns unknown error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ error: 'access_denied', error_description: 'User denied access' }),
      });
      const result = await service.pollDeviceAuth(namespace, 'dev-code-123');
      expect(result).toEqual({ status: 'error', message: 'User denied access' });
    });

    it('should return error when response has no access_token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });
      const result = await service.pollDeviceAuth(namespace, 'dev-code-123');
      expect(result).toEqual({ status: 'error', message: 'No access_token in response' });
    });
  });
});
