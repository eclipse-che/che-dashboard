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

import mockAxios from 'axios';

import {
  checkWorkspaceStorageQuota,
  getWorkspaceStorage,
  getWorkspaceStorageUsage,
  resizeWorkspaceStorage,
} from '@/services/backend-client/workspaceStorageApi';

describe('Workspace Storage API', () => {
  const mockGet = mockAxios.get as jest.Mock;
  const mockPatch = mockAxios.patch as jest.Mock;

  const namespace = 'user-che';
  const workspaceName = 'my-workspace';
  const path = `/dashboard/api/namespace/${namespace}/devworkspaces/${workspaceName}/storage`;

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('getWorkspaceStorage', async () => {
    const info = { strategy: 'per-user', shared: true };
    mockGet.mockResolvedValueOnce({ data: info });

    await expect(getWorkspaceStorage(namespace, workspaceName)).resolves.toEqual(info);
    expect(mockGet).toHaveBeenCalledWith(path, undefined);
  });

  test('getWorkspaceStorage error', async () => {
    mockGet.mockRejectedValueOnce(new Error('not found'));

    await expect(getWorkspaceStorage(namespace, workspaceName)).rejects.toThrow(
      'Failed to fetch the workspace storage. not found',
    );
  });

  test('getWorkspaceStorageUsage', async () => {
    const usage = { totalBytes: 10, usedBytes: 4, availableBytes: 6 };
    mockGet.mockResolvedValueOnce({ data: usage });

    await expect(getWorkspaceStorageUsage(namespace, workspaceName)).resolves.toEqual(usage);
    expect(mockGet).toHaveBeenCalledWith(`${path}/usage`, undefined);
  });

  test('getWorkspaceStorageUsage error', async () => {
    mockGet.mockRejectedValueOnce(new Error('not running'));

    await expect(getWorkspaceStorageUsage(namespace, workspaceName)).rejects.toThrow(
      'Failed to fetch the workspace storage usage. not running',
    );
  });

  test('checkWorkspaceStorageQuota', async () => {
    const quota = { status: 'ok', entries: [] };
    mockGet.mockResolvedValueOnce({ data: quota });

    await expect(checkWorkspaceStorageQuota(namespace, workspaceName, '15Gi')).resolves.toEqual(
      quota,
    );
    expect(mockGet).toHaveBeenCalledWith(`${path}/quota`, { params: { size: '15Gi' } });
  });

  test('checkWorkspaceStorageQuota error', async () => {
    mockGet.mockRejectedValueOnce(new Error('boom'));

    await expect(checkWorkspaceStorageQuota(namespace, workspaceName, '15Gi')).rejects.toThrow(
      'Failed to check the storage quota. boom',
    );
  });

  test('resizeWorkspaceStorage', async () => {
    const info = { strategy: 'per-user', requested: '15Gi' };
    mockPatch.mockResolvedValueOnce({ data: info });

    await expect(resizeWorkspaceStorage(namespace, workspaceName, '15Gi')).resolves.toEqual(info);
    expect(mockPatch).toHaveBeenCalledWith(path, { size: '15Gi' }, undefined);
  });

  test('resizeWorkspaceStorage returns the backend message', async () => {
    mockPatch.mockRejectedValueOnce(new Error('The new size exceeds the namespace quota'));

    await expect(resizeWorkspaceStorage(namespace, workspaceName, '15Gi')).rejects.toThrow(
      /^The new size exceeds the namespace quota$/,
    );
  });
});
