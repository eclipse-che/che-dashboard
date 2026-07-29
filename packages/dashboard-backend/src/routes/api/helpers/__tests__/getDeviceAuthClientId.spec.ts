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

const mockReadNamespacedConfigMap = jest.fn();

jest.mock('@/routes/api/helpers/getServiceAccountToken', () => ({
  getServiceAccountToken: jest.fn().mockReturnValue('sa-token'),
}));

jest.mock('@/services/kubeclient/kubeConfigProvider', () => ({
  KubeConfigProvider: jest.fn().mockImplementation(() => ({
    getKubeConfig: jest.fn().mockReturnValue({}),
  })),
}));

jest.mock('@/devworkspaceClient/services/helpers/prepareCoreV1API', () => ({
  prepareCoreV1API: jest.fn().mockReturnValue({
    readNamespacedConfigMap: (...args: unknown[]) => mockReadNamespacedConfigMap(...args),
  }),
}));

describe('getDeviceAuthClientId', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...origEnv };
    delete process.env.DEVICE_AUTH_GITHUB_CLIENT_ID;
    process.env.CHECLUSTER_CR_NAMESPACE = 'eclipse-che';
    mockReadNamespacedConfigMap.mockReset();
  });

  afterEach(() => {
    process.env = origEnv;
  });

  it('returns client_id from ConfigMap when present', async () => {
    mockReadNamespacedConfigMap.mockResolvedValueOnce({
      data: { github_client_id: '01ab8ac9400c4e429b23' },
    });
    let result: string | null;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getDeviceAuthClientId } = require('@/routes/api/helpers/getDeviceAuthClientId');
      result = getDeviceAuthClientId();
    });
    await expect(result!).resolves.toBe('01ab8ac9400c4e429b23');
  });

  it('returns null when ConfigMap key is absent', async () => {
    mockReadNamespacedConfigMap.mockResolvedValueOnce({ data: {} });
    let result: Promise<string | null>;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getDeviceAuthClientId } = require('@/routes/api/helpers/getDeviceAuthClientId');
      result = getDeviceAuthClientId();
    });
    await expect(result!).resolves.toBeNull();
  });

  it('returns null when ConfigMap does not exist', async () => {
    mockReadNamespacedConfigMap.mockRejectedValueOnce(
      Object.assign(new Error('Not Found'), { code: 404 }),
    );
    let result: Promise<string | null>;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getDeviceAuthClientId } = require('@/routes/api/helpers/getDeviceAuthClientId');
      result = getDeviceAuthClientId();
    });
    await expect(result!).resolves.toBeNull();
  });

  it('returns value from DEVICE_AUTH_GITHUB_CLIENT_ID env var without hitting K8s', async () => {
    process.env.DEVICE_AUTH_GITHUB_CLIENT_ID = 'local-override-id';
    let result: Promise<string | null>;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getDeviceAuthClientId } = require('@/routes/api/helpers/getDeviceAuthClientId');
      result = getDeviceAuthClientId();
    });
    await expect(result!).resolves.toBe('local-override-id');
    expect(mockReadNamespacedConfigMap).not.toHaveBeenCalled();
  });

  it('returns null when CHECLUSTER_CR_NAMESPACE is not set', async () => {
    delete process.env.CHECLUSTER_CR_NAMESPACE;
    let result: Promise<string | null>;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getDeviceAuthClientId } = require('@/routes/api/helpers/getDeviceAuthClientId');
      result = getDeviceAuthClientId();
    });
    await expect(result!).resolves.toBeNull();
    expect(mockReadNamespacedConfigMap).not.toHaveBeenCalled();
  });

  it('caches the result for subsequent calls', async () => {
    mockReadNamespacedConfigMap.mockResolvedValue({
      data: { github_client_id: 'cached-id' },
    });
    let getDeviceAuthClientId: () => Promise<string | null>;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      ({ getDeviceAuthClientId } = require('@/routes/api/helpers/getDeviceAuthClientId'));
    });
    await getDeviceAuthClientId!();
    await getDeviceAuthClientId!();
    expect(mockReadNamespacedConfigMap).toHaveBeenCalledTimes(1);
  });
});
