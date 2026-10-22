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

import * as helper from '@/devworkspaceClient/services/helpers/exec';
import { WorkspaceStorageApiService } from '@/devworkspaceClient/services/storageApi';
import {
  buildApiException,
  buildDevWorkspace,
  buildPod,
  buildPvc,
  namespace,
  workspaceId,
  workspaceName,
} from '@/devworkspaceClient/services/storageApi/__tests__/fixtures';
import { clearStorageClassCache } from '@/devworkspaceClient/services/storageApi/storageClassService';

describe('WorkspaceStorageApiService', () => {
  const mockGetDevWorkspace = jest.fn();
  const mockListPods = jest.fn();
  const mockReadPvc = jest.fn();
  const mockPatchPvc = jest.fn();
  const mockListQuotas = jest.fn();
  const mockListLimitRanges = jest.fn();
  const mockUserReadStorageClass = jest.fn();
  const mockSaReadStorageClass = jest.fn();
  const spyExec = jest.spyOn(helper, 'exec');

  let userKc: k8s.KubeConfig;
  let saKc: k8s.KubeConfig;
  let service: WorkspaceStorageApiService;

  beforeEach(() => {
    clearStorageClassCache();

    userKc = new k8s.KubeConfig();
    userKc.makeApiClient = jest.fn().mockImplementation(api => {
      if (api === k8s.CustomObjectsApi) {
        return { getNamespacedCustomObject: mockGetDevWorkspace };
      }
      if (api === k8s.StorageV1Api) {
        return { readStorageClass: mockUserReadStorageClass };
      }
      return {
        listNamespacedPod: mockListPods,
        readNamespacedPersistentVolumeClaim: mockReadPvc,
        patchNamespacedPersistentVolumeClaim: mockPatchPvc,
        listNamespacedResourceQuota: mockListQuotas,
        listNamespacedLimitRange: mockListLimitRanges,
      };
    });
    // the service account is only allowed to read storage classes
    saKc = new k8s.KubeConfig();
    saKc.makeApiClient = jest.fn().mockReturnValue({ readStorageClass: mockSaReadStorageClass });

    service = new WorkspaceStorageApiService(userKc, saKc);

    mockGetDevWorkspace.mockResolvedValue(buildDevWorkspace({ phase: 'Running' }));
    mockListPods.mockResolvedValue({ items: [buildPod('claim-from-pod')] });
    mockReadPvc.mockResolvedValue(buildPvc({ name: 'claim-from-pod' }));
    mockPatchPvc.mockResolvedValue(buildPvc({ name: 'claim-from-pod', requested: '15Gi' }));
    mockListQuotas.mockResolvedValue({ items: [] });
    mockListLimitRanges.mockResolvedValue({ items: [] });
    mockUserReadStorageClass.mockRejectedValue(buildApiException(403, 'forbidden'));
    mockSaReadStorageClass.mockResolvedValue({ allowVolumeExpansion: true });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getInfo', () => {
    it('should resolve the PVC from the workspace pod', async () => {
      const info = await service.getInfo(namespace, workspaceName, 'per-workspace');

      expect(mockGetDevWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({ namespace, name: workspaceName }),
      );
      expect(mockListPods).toHaveBeenCalledWith({
        namespace,
        labelSelector: `controller.devfile.io/devworkspace_id=${workspaceId}`,
      });
      expect(mockReadPvc).toHaveBeenCalledWith({ namespace, name: 'claim-from-pod' });
      expect(info).toEqual(
        expect.objectContaining({
          strategy: 'per-workspace',
          pvcName: 'claim-from-pod',
          shared: false,
          expandability: 'allowed',
        }),
      );
    });

    it('should use the naming convention when no pod exists', async () => {
      mockGetDevWorkspace.mockResolvedValue(buildDevWorkspace({ storageType: 'per-workspace' }));
      mockListPods.mockResolvedValue({ items: [] });

      const info = await service.getInfo(namespace, workspaceName);

      expect(info.pvcName).toEqual(`storage-${workspaceId}`);
    });

    it('should use the naming convention when pods cannot be listed', async () => {
      mockGetDevWorkspace.mockResolvedValue(buildDevWorkspace());
      mockListPods.mockRejectedValue(buildApiException(403, 'forbidden'));

      const info = await service.getInfo(namespace, workspaceName);

      expect(info.pvcName).toEqual('claim-devworkspace');
    });

    it('should prefer a pod that is not being deleted', async () => {
      const terminating = buildPod('old-claim');
      terminating.metadata!.deletionTimestamp = new Date();
      mockListPods.mockResolvedValue({ items: [terminating, buildPod('new-claim')] });

      const info = await service.getInfo(namespace, workspaceName);

      expect(info.pvcName).toEqual('new-claim');
    });

    it('should not look for a pod without workspace id', async () => {
      mockGetDevWorkspace.mockResolvedValue(buildDevWorkspace({ workspaceId: null }));

      await service.getInfo(namespace, workspaceName);

      expect(mockListPods).not.toHaveBeenCalled();
    });

    it('should forward the DevWorkspace read error', async () => {
      mockGetDevWorkspace.mockRejectedValue(buildApiException(404, 'not found'));

      await expect(service.getInfo(namespace, workspaceName)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('getUsage', () => {
    it('should exec df in the workspace pod', async () => {
      spyExec.mockResolvedValue({
        stdOut: '/dev/rbd0 10485760 5242880 5242880 50% /projects',
        stdError: '',
      });

      await expect(service.getUsage(namespace, workspaceName)).resolves.toEqual({
        totalBytes: 10485760 * 1024,
        usedBytes: 5242880 * 1024,
        availableBytes: 5242880 * 1024,
      });
    });

    it('should return 409 when the workspace is stopped', async () => {
      mockGetDevWorkspace.mockResolvedValue(buildDevWorkspace({ phase: 'Stopped' }));
      mockListPods.mockResolvedValue({ items: [] });

      await expect(service.getUsage(namespace, workspaceName)).rejects.toMatchObject({
        statusCode: 409,
      });
    });
  });

  describe('checkQuota', () => {
    it('should check the quota of the workspace PVC', async () => {
      await expect(service.checkQuota(namespace, workspaceName, '15Gi')).resolves.toEqual({
        status: 'ok',
        entries: [],
      });
      expect(mockReadPvc).toHaveBeenCalledWith({ namespace, name: 'claim-from-pod' });
    });

    it('should reject an invalid size', async () => {
      await expect(service.checkQuota(namespace, workspaceName, 'abc')).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(mockGetDevWorkspace).not.toHaveBeenCalled();
    });

    it('should reject ephemeral workspaces', async () => {
      mockGetDevWorkspace.mockResolvedValue(buildDevWorkspace({ storageType: 'ephemeral' }));

      await expect(service.checkQuota(namespace, workspaceName, '15Gi')).rejects.toMatchObject({
        statusCode: 400,
      });
    });
  });

  describe('resize', () => {
    it('should patch the PVC with the user token, never with the service account', async () => {
      const info = await service.resize(namespace, workspaceName, '15Gi');

      expect(mockPatchPvc).toHaveBeenCalledWith(
        expect.objectContaining({ namespace, name: 'claim-from-pod' }),
        expect.anything(),
      );
      expect(info.requested).toEqual('15Gi');
      // the service account kubeconfig is only used to build the storage class client
      expect(saKc.makeApiClient).toHaveBeenCalledTimes(1);
      expect(saKc.makeApiClient).toHaveBeenCalledWith(k8s.StorageV1Api);
      expect(mockSaReadStorageClass).toHaveBeenCalled();
    });
  });
});
