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
import { StorageClassService } from '@/devworkspaceClient/services/storageApi/storageClassService';

describe('StorageClassService', () => {
  const userReadStorageClass = jest.fn();
  let userKc: k8s.KubeConfig;

  beforeEach(() => {
    userKc = new k8s.KubeConfig();
    userKc.makeApiClient = jest.fn().mockReturnValue({ readStorageClass: userReadStorageClass });
  });

  afterEach(() => {
    jest.resetAllMocks();
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

  it('should not share a result between users', async () => {
    const otherReadStorageClass = jest.fn();
    const otherKc = new k8s.KubeConfig();
    otherKc.makeApiClient = jest.fn().mockReturnValue({ readStorageClass: otherReadStorageClass });
    userReadStorageClass.mockResolvedValue({ allowVolumeExpansion: true });
    otherReadStorageClass.mockRejectedValue(buildApiException(403, 'forbidden'));

    await expect(new StorageClassService(userKc).getExpandability('standard')).resolves.toEqual(
      'allowed',
    );
    await expect(new StorageClassService(otherKc).getExpandability('standard')).resolves.toEqual(
      'unknown',
    );
  });
});
