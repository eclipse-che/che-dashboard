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

import { MERGE_PATCH_OPTIONS } from '@/devworkspaceClient/services/helpers/patchOptions';
import {
  buildApiException,
  buildPvc,
  namespace,
} from '@/devworkspaceClient/services/storageApi/__tests__/fixtures';
import { PvcResolution } from '@/devworkspaceClient/services/storageApi/pvcResolver';
import { getRequestedSize, PvcService } from '@/devworkspaceClient/services/storageApi/pvcService';
import { StorageClassService } from '@/devworkspaceClient/services/storageApi/storageClassService';

describe('getRequestedSize', () => {
  it('should fall back to the capacity when no size is requested', () => {
    const pvc = buildPvc({ capacity: '10Gi' });
    delete pvc.spec!.resources;

    expect(getRequestedSize(pvc)).toEqual('10Gi');
  });
});

describe('PvcService', () => {
  const mockReadPvc = jest.fn();
  const mockPatchPvc = jest.fn();
  const mockGetExpandability = jest.fn();

  const perUser: PvcResolution = {
    strategy: 'per-user',
    pvcName: 'claim-devworkspace',
    shared: true,
  };

  let userKc: k8s.KubeConfig;
  let service: PvcService;

  beforeEach(() => {
    userKc = new k8s.KubeConfig();
    userKc.makeApiClient = jest.fn().mockReturnValue({
      readNamespacedPersistentVolumeClaim: mockReadPvc,
      patchNamespacedPersistentVolumeClaim: mockPatchPvc,
    });
    const storageClassService = {
      getExpandability: mockGetExpandability,
    } as unknown as StorageClassService;
    service = new PvcService(userKc, storageClassService);

    mockReadPvc.mockResolvedValue(buildPvc({ requested: '10Gi' }));
    mockPatchPvc.mockImplementation(({ body }) =>
      Promise.resolve(
        buildPvc({
          requested: body.spec.resources.requests.storage,
          capacity: '10Gi',
          conditions: ['Resizing'],
        }),
      ),
    );
    mockGetExpandability.mockResolvedValue('allowed');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getInfo', () => {
    it('should map capacity and requested size', async () => {
      mockReadPvc.mockResolvedValue(buildPvc({ requested: '15Gi', capacity: '10Gi' }));

      const info = await service.getInfo(namespace, perUser);

      expect(mockReadPvc).toHaveBeenCalledWith({ namespace, name: 'claim-devworkspace' });
      expect(mockGetExpandability).toHaveBeenCalledWith('standard');
      expect(info).toEqual({
        strategy: 'per-user',
        pvcName: 'claim-devworkspace',
        shared: true,
        storageClassName: 'standard',
        requested: '15Gi',
        capacity: '10Gi',
        expandability: 'allowed',
        resizing: false,
        fsResizePending: false,
      });
    });

    it.each([
      [['Resizing'], true, false],
      [['FileSystemResizePending'], false, true],
      [['Resizing', 'FileSystemResizePending'], true, true],
    ])('should map conditions %j', async (conditions, resizing, fsResizePending) => {
      mockReadPvc.mockResolvedValue(buildPvc({ conditions }));

      const info = await service.getInfo(namespace, perUser);

      expect(info.resizing).toBe(resizing);
      expect(info.fsResizePending).toBe(fsResizePending);
    });

    it('should ignore conditions with status other than True', async () => {
      const pvc = buildPvc();
      pvc.status!.conditions = [{ type: 'Resizing', status: 'False' }];
      mockReadPvc.mockResolvedValue(pvc);

      expect((await service.getInfo(namespace, perUser)).resizing).toBe(false);
    });

    it('should not read any PVC for ephemeral storage', async () => {
      const info = await service.getInfo(namespace, { strategy: 'ephemeral', shared: false });

      expect(mockReadPvc).not.toHaveBeenCalled();
      expect(info).toEqual({
        strategy: 'ephemeral',
        shared: false,
        expandability: 'unknown',
        resizing: false,
        fsResizePending: false,
      });
    });

    it('should throw 404 if the PVC does not exist', async () => {
      mockReadPvc.mockRejectedValue(buildApiException(404, 'not found'));

      await expect(service.getInfo(namespace, perUser)).rejects.toMatchObject({
        statusCode: 404,
        message: expect.stringContaining('not found'),
      });
    });

    it('should forward other read errors', async () => {
      mockReadPvc.mockRejectedValue(buildApiException(403, 'pvc is forbidden'));

      await expect(service.getInfo(namespace, perUser)).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringContaining('pvc is forbidden'),
      });
    });

    it('should return 500 on unexpected read errors', async () => {
      mockReadPvc.mockRejectedValue(new Error('connection reset'));

      await expect(service.getInfo(namespace, perUser)).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining('connection reset'),
      });
    });
  });

  describe('resize', () => {
    it('should send a merge patch with the user token', async () => {
      const info = await service.resize(namespace, perUser, '15Gi');

      expect(mockPatchPvc).toHaveBeenCalledWith(
        {
          namespace,
          name: 'claim-devworkspace',
          body: { spec: { resources: { requests: { storage: '15Gi' } } } },
        },
        MERGE_PATCH_OPTIONS,
      );
      expect(userKc.makeApiClient).toHaveBeenCalledWith(k8s.CoreV1Api);
      expect(info).toEqual(
        expect.objectContaining({ requested: '15Gi', capacity: '10Gi', resizing: true }),
      );
    });

    it('should accept a size in another unit', async () => {
      await service.resize(namespace, perUser, '11000M');
      expect(mockPatchPvc).toHaveBeenCalled();
    });

    it.each([['10Gi'], ['10240Mi'], ['5Gi']])('should reject %s (no-op or shrink)', async size => {
      await expect(service.resize(namespace, perUser, size)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('Shrinking or no-op resize is not supported'),
      });
      expect(mockPatchPvc).not.toHaveBeenCalled();
    });

    it.each([['abc'], ['-5Gi'], ['']])('should reject the invalid quantity "%s"', async size => {
      await expect(service.resize(namespace, perUser, size)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('Invalid storage size'),
      });
      expect(mockPatchPvc).not.toHaveBeenCalled();
    });

    it('should reject ephemeral storage', async () => {
      await expect(
        service.resize(namespace, { strategy: 'ephemeral', shared: false }, '15Gi'),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(mockReadPvc).not.toHaveBeenCalled();
    });

    it('should reject a forbidden expansion', async () => {
      mockGetExpandability.mockResolvedValue('forbidden');

      await expect(service.resize(namespace, perUser, '15Gi')).rejects.toMatchObject({
        statusCode: 400,
        message: 'The storage class does not allow volume expansion',
      });
      expect(mockPatchPvc).not.toHaveBeenCalled();
    });

    it('should attempt the patch when expandability is unknown', async () => {
      mockGetExpandability.mockResolvedValue('unknown');

      await service.resize(namespace, perUser, '15Gi');

      expect(mockPatchPvc).toHaveBeenCalled();
    });

    it('should map an exceeded quota to 422', async () => {
      mockPatchPvc.mockRejectedValue(
        buildApiException(
          403,
          'persistentvolumeclaims "claim-devworkspace" is forbidden: exceeded quota: storage, requested: requests.storage=5Gi, used: requests.storage=48Gi, limited: requests.storage=50Gi',
        ),
      );

      await expect(service.resize(namespace, perUser, '15Gi')).rejects.toMatchObject({
        statusCode: 422,
        message: expect.stringMatching(
          /^The new size exceeds the namespace quota: .*exceeded quota/,
        ),
      });
    });

    it('should map a LimitRange rejection to 422', async () => {
      mockPatchPvc.mockRejectedValue(
        buildApiException(
          403,
          'persistentvolumeclaims "claim-devworkspace" is forbidden: maximum storage usage per PersistentVolumeClaim is 12Gi, but request is 15Gi',
        ),
      );

      await expect(service.resize(namespace, perUser, '15Gi')).rejects.toMatchObject({
        statusCode: 422,
      });
    });

    it('should map an admission rejection to 400', async () => {
      mockPatchPvc.mockRejectedValue(
        buildApiException(
          403,
          'persistentvolumeclaims "claim-devworkspace" is forbidden: only dynamically provisioned pvc can be resized and the storageclass that provisions the pvc must support resize',
        ),
      );

      await expect(service.resize(namespace, perUser, '15Gi')).rejects.toMatchObject({
        statusCode: 400,
        message: 'The storage class does not allow volume expansion',
      });
    });

    it('should forward other 403 errors', async () => {
      mockPatchPvc.mockRejectedValue(
        buildApiException(403, 'User "dev" cannot patch resource "persistentvolumeclaims"'),
      );

      await expect(service.resize(namespace, perUser, '15Gi')).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringContaining('cannot patch resource'),
      });
    });

    it('should return 500 on unexpected errors', async () => {
      mockPatchPvc.mockRejectedValue(new Error('network error'));

      await expect(service.resize(namespace, perUser, '15Gi')).rejects.toMatchObject({
        statusCode: 500,
      });
    });
  });
});
