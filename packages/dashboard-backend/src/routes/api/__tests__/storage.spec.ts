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

import { FastifyInstance } from 'fastify';

import { baseApiPath } from '@/constants/config';
import { DevWorkspaceClient } from '@/devworkspaceClient';
import { WorkspaceStorageApiService } from '@/devworkspaceClient/services/storageApi';
import { StorageApiError } from '@/devworkspaceClient/services/storageApi/errors';
import { stubToken as stubSaToken } from '@/routes/api/helpers/__mocks__/getServiceAccountToken';
import { stubToken as stubUserToken } from '@/routes/api/helpers/__mocks__/getToken';
import { getDevWorkspaceClient } from '@/routes/api/helpers/getDevWorkspaceClient';
import { clearDefaultStrategyCache } from '@/routes/api/storage';
import { setup, teardown } from '@/utils/appBuilder';

jest.mock('@/routes/api/helpers/getServiceAccountToken');
jest.mock('@/routes/api/helpers/getToken');
jest.mock('@/routes/api/helpers/getDevWorkspaceClient');

// each kubeconfig carries the token it was built with
const mockGetKubeConfig = jest.fn((token: string) => ({ token }));
jest.mock('@/services/kubeclient/kubeConfigProvider', () => ({
  KubeConfigProvider: jest.fn().mockImplementation(() => ({
    getKubeConfig: mockGetKubeConfig,
    getSAKubeConfig: () => ({}),
  })),
}));

const mockGetInfo = jest.fn();
const mockGetUsage = jest.fn();
const mockCheckQuota = jest.fn();
const mockResize = jest.fn();

jest.mock('@/devworkspaceClient/services/storageApi', () => ({
  WorkspaceStorageApiService: jest.fn().mockImplementation(() => ({
    getInfo: mockGetInfo,
    getUsage: mockGetUsage,
    checkQuota: mockCheckQuota,
    resize: mockResize,
  })),
}));

describe('Workspace Storage Routes', () => {
  let app: FastifyInstance;
  const namespace = 'user-che';
  const workspaceName = 'my-workspace';
  const path = `${baseApiPath}/namespace/${namespace}/devworkspaces/${workspaceName}/storage`;

  const info = {
    strategy: 'per-user',
    pvcName: 'claim-devworkspace',
    shared: true,
    storageClassName: 'standard',
    requested: '10Gi',
    capacity: '10Gi',
    expandability: 'allowed',
    resizing: false,
    fsResizePending: false,
  };

  beforeAll(async () => {
    app = await setup();
  });

  afterAll(() => {
    teardown(app);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    clearDefaultStrategyCache();
  });

  function expectTokensForwarded() {
    expect(WorkspaceStorageApiService).toHaveBeenCalledTimes(1);
    expect(WorkspaceStorageApiService).toHaveBeenCalledWith(
      { token: stubUserToken },
      { token: stubSaToken },
    );
  }

  describe('GET storage', () => {
    test('happy path', async () => {
      mockGetInfo.mockResolvedValue(info);

      const res = await app.inject().get(path);

      expect(res.statusCode).toEqual(200);
      expect(res.json()).toEqual(info);
      // the default PVC strategy is read from the CheCluster with the service account
      expect(getDevWorkspaceClient).toHaveBeenCalledWith(stubSaToken);
      expect(mockGetInfo).toHaveBeenCalledWith(namespace, workspaceName, undefined);
      expectTokensForwarded();
    });

    test('forwards the CheCluster default strategy', async () => {
      mockGetInfo.mockResolvedValue(info);
      (getDevWorkspaceClient as jest.Mock).mockImplementationOnce(
        () =>
          ({
            serverConfigApi: {
              fetchCheCustomResource: () => Promise.resolve({}),
              getPvcStrategy: () => 'per-workspace',
            },
          }) as unknown as DevWorkspaceClient,
      );

      await app.inject().get(path);

      expect(mockGetInfo).toHaveBeenCalledWith(namespace, workspaceName, 'per-workspace');
    });

    test('caches the CheCluster default strategy', async () => {
      mockGetInfo.mockResolvedValue(info);

      await app.inject().get(path);
      await app.inject().get(path);

      expect(getDevWorkspaceClient).toHaveBeenCalledTimes(1);
    });

    test('ignores CheCluster read errors', async () => {
      mockGetInfo.mockResolvedValue(info);
      (getDevWorkspaceClient as jest.Mock).mockImplementationOnce(
        () =>
          ({
            serverConfigApi: {
              fetchCheCustomResource: () => Promise.reject(new Error('forbidden')),
            },
          }) as unknown as DevWorkspaceClient,
      );

      const res = await app.inject().get(path);

      expect(res.statusCode).toEqual(200);
      expect(mockGetInfo).toHaveBeenCalledWith(namespace, workspaceName, undefined);
    });

    test('service error', async () => {
      mockGetInfo.mockRejectedValue(new StorageApiError('PVC not found', 404));

      const res = await app.inject().get(path);

      expect(res.statusCode).toEqual(404);
      expect(res.json().message).toEqual('PVC not found');
    });
  });

  describe('GET storage/usage', () => {
    test('happy path', async () => {
      const usage = { totalBytes: 100, usedBytes: 40, availableBytes: 60 };
      mockGetUsage.mockResolvedValue(usage);

      const res = await app.inject().get(`${path}/usage`);

      expect(res.statusCode).toEqual(200);
      expect(res.json()).toEqual(usage);
      expect(mockGetUsage).toHaveBeenCalledWith(namespace, workspaceName);
      expectTokensForwarded();
    });

    test('workspace stopped', async () => {
      mockGetUsage.mockRejectedValue(new StorageApiError('The workspace is not running', 409));

      const res = await app.inject().get(`${path}/usage`);

      expect(res.statusCode).toEqual(409);
    });
  });

  describe('GET storage/quota', () => {
    test('happy path', async () => {
      const quota = { status: 'ok', entries: [] };
      mockCheckQuota.mockResolvedValue(quota);

      const res = await app.inject().get(`${path}/quota?size=15Gi`);

      expect(res.statusCode).toEqual(200);
      expect(res.json()).toEqual(quota);
      expect(mockCheckQuota).toHaveBeenCalledWith(namespace, workspaceName, '15Gi', undefined);
      expectTokensForwarded();
    });

    test('missing size', async () => {
      const res = await app.inject().get(`${path}/quota`);

      expect(res.statusCode).toEqual(400);
      expect(mockCheckQuota).not.toHaveBeenCalled();
    });

    test('invalid size', async () => {
      mockCheckQuota.mockRejectedValue(new StorageApiError('Invalid storage size "abc"', 400));

      const res = await app.inject().get(`${path}/quota?size=abc`);

      expect(res.statusCode).toEqual(400);
      expect(res.json().message).toEqual('Invalid storage size "abc"');
    });
  });

  describe('PATCH storage', () => {
    test('happy path', async () => {
      mockResize.mockResolvedValue({ ...info, requested: '15Gi', resizing: true });

      const res = await app.inject().patch(path).payload({ size: '15Gi' });

      expect(res.statusCode).toEqual(200);
      expect(res.json()).toEqual(expect.objectContaining({ requested: '15Gi', resizing: true }));
      expect(mockResize).toHaveBeenCalledWith(namespace, workspaceName, '15Gi', undefined);
      expectTokensForwarded();
    });

    test.each([[{}], [{ size: '' }]])('invalid body %j', async body => {
      const res = await app.inject().patch(path).payload(body);

      expect(res.statusCode).toEqual(400);
      expect(mockResize).not.toHaveBeenCalled();
    });

    test('quota exceeded', async () => {
      mockResize.mockRejectedValue(
        new StorageApiError('The new size exceeds the namespace quota: exceeded quota', 422),
      );

      const res = await app.inject().patch(path).payload({ size: '100Gi' });

      expect(res.statusCode).toEqual(422);
      expect(res.json().message).toContain('exceeds the namespace quota');
    });
  });
});
