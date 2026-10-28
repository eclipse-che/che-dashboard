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

import * as k8s from '@kubernetes/client-node';

import { buildApiException } from '@/devworkspaceClient/services/storageApi/__tests__/fixtures';
import {
  clearStorageClassCache,
  STORAGE_CLASS_CACHE_TTL_MS,
  StorageClassService,
} from '@/devworkspaceClient/services/storageApi/storageClassService';

describe('StorageClassService', () => {
  const userReadStorageClass = jest.fn();
  let userKc: k8s.KubeConfig;

  beforeEach(() => {
    clearStorageClassCache();
    userKc = new k8s.KubeConfig();
    userKc.makeApiClient = jest.fn().mockReturnValue({ readStorageClass: userReadStorageClass });
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
  });

  it.each([
    [true, 'allowed'],
    [false, 'forbidden'],
    [undefined, 'forbidden'],
  ])('allowVolumeExpansion=%s → %s with the user token', async (allow, expected) => {
    userReadStorageClass.mockResolvedValue({ allowVolumeExpansion: allow });

    const service = new StorageClassService(userKc);
    await expect(service.getExpandability('standard')).resolves.toEqual(expected);

    expect(userReadStorageClass).toHaveBeenCalledWith({ name: 'standard' });
  });

  it.each([403, 404])('should return unknown on %s', async statusCode => {
    userReadStorageClass.mockRejectedValue(buildApiException(statusCode, 'error'));

    const service = new StorageClassService(userKc);
    await expect(service.getExpandability('standard')).resolves.toEqual('unknown');
  });

  it('should return unknown without storage class name', async () => {
    const service = new StorageClassService(userKc);
    await expect(service.getExpandability(undefined)).resolves.toEqual('unknown');
    await expect(service.getExpandability('')).resolves.toEqual('unknown');

    expect(userReadStorageClass).not.toHaveBeenCalled();
  });

  it('should cache results and refresh them after expiry', async () => {
    jest.useFakeTimers();
    userReadStorageClass.mockResolvedValue({ allowVolumeExpansion: true });

    const service = new StorageClassService(userKc);
    await service.getExpandability('standard');
    await new StorageClassService(userKc).getExpandability('standard');

    expect(userReadStorageClass).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(STORAGE_CLASS_CACHE_TTL_MS + 1);
    userReadStorageClass.mockResolvedValue({ allowVolumeExpansion: false });

    await expect(service.getExpandability('standard')).resolves.toEqual('forbidden');
    expect(userReadStorageClass).toHaveBeenCalledTimes(2);
  });

  it('should cache unknown results', async () => {
    userReadStorageClass.mockRejectedValueOnce(buildApiException(500, 'error'));
    userReadStorageClass.mockResolvedValueOnce({ allowVolumeExpansion: true });

    const service = new StorageClassService(userKc);
    await expect(service.getExpandability('standard')).resolves.toEqual('unknown');
    await expect(service.getExpandability('standard')).resolves.toEqual('unknown');
    expect(userReadStorageClass).toHaveBeenCalledTimes(1);
  });
});
