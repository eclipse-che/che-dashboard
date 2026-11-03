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

import { helpers, WorkspaceStorageInfo } from '@eclipse-che/common';
import * as k8s from '@kubernetes/client-node';

import { MERGE_PATCH_OPTIONS } from '@/devworkspaceClient/services/helpers/patchOptions';
import { getStatusCode, StorageApiError } from '@/devworkspaceClient/services/storageApi/errors';
import { PvcResolution } from '@/devworkspaceClient/services/storageApi/pvcResolver';
import { StorageClassService } from '@/devworkspaceClient/services/storageApi/storageClassService';

type CoreV1API = Pick<
  k8s.CoreV1Api,
  'readNamespacedPersistentVolumeClaim' | 'patchNamespacedPersistentVolumeClaim'
>;

const QUOTA_ERROR_REGEX = /exceeded quota|maximum storage usage per PersistentVolumeClaim/i;
const EXPANSION_FORBIDDEN_REGEX =
  /only dynamically provisioned pvc can be resized|must support resize|does not allow expansion/i;

export function hasCondition(pvc: k8s.V1PersistentVolumeClaim, type: string): boolean {
  return pvc.status?.conditions?.some(c => c.type === type && c.status === 'True') === true;
}

export function getRequestedSize(pvc: k8s.V1PersistentVolumeClaim): string | undefined {
  return pvc.spec?.resources?.requests?.storage ?? pvc.status?.capacity?.storage;
}

/**
 * Returns the current size of the PVC in bytes.
 * @throws StorageApiError if the new size is not larger, as volumes can't shrink
 */
export function assertGrows(pvc: k8s.V1PersistentVolumeClaim, newBytes: number): number {
  const currentSize = getRequestedSize(pvc);
  const currentBytes = currentSize ? helpers.quantity.parseQuantity(currentSize) : 0;
  if (newBytes <= currentBytes) {
    throw new StorageApiError(
      `Shrinking or no-op resize is not supported: the current size is ${currentSize}`,
      400,
    );
  }
  return currentBytes;
}

/**
 * Reads and resizes workspace PVCs. All calls are made with the user token.
 */
export class PvcService {
  private readonly coreV1Api: CoreV1API;

  constructor(
    userKc: k8s.KubeConfig,
    private readonly storageClassService: StorageClassService,
  ) {
    this.coreV1Api = userKc.makeApiClient(k8s.CoreV1Api);
  }

  async readPvc(namespace: string, name: string): Promise<k8s.V1PersistentVolumeClaim> {
    try {
      return await this.coreV1Api.readNamespacedPersistentVolumeClaim({ namespace, name });
    } catch (e) {
      const statusCode = getStatusCode(e) || 500;
      const message =
        statusCode === 404
          ? `PersistentVolumeClaim "${name}" not found. It is created when the workspace starts.`
          : `Unable to read PersistentVolumeClaim "${name}": ${helpers.errors.getMessage(e)}`;
      throw new StorageApiError(message, statusCode);
    }
  }

  async getInfo(namespace: string, resolution: PvcResolution): Promise<WorkspaceStorageInfo> {
    const { strategy, pvcName, shared } = resolution;
    if (!pvcName) {
      return {
        strategy,
        shared,
        expandability: 'unknown',
        resizing: false,
        fsResizePending: false,
      };
    }
    const pvc = await this.readPvc(namespace, pvcName);
    return this.buildStorageInfo(resolution, pvc);
  }

  private async buildStorageInfo(
    { strategy, pvcName, shared }: PvcResolution,
    pvc: k8s.V1PersistentVolumeClaim,
  ): Promise<WorkspaceStorageInfo> {
    const storageClassName = pvc.spec?.storageClassName;
    return {
      strategy,
      pvcName,
      shared,
      storageClassName,
      requested: pvc.spec?.resources?.requests?.storage,
      capacity: pvc.status?.capacity?.storage,
      expandability: await this.storageClassService.getExpandability(storageClassName),
      resizing: hasCondition(pvc, 'Resizing'),
      fsResizePending: hasCondition(pvc, 'FileSystemResizePending'),
    };
  }

  async resize(
    namespace: string,
    resolution: PvcResolution,
    size: string,
  ): Promise<WorkspaceStorageInfo> {
    const { strategy, pvcName } = resolution;
    if (strategy === 'ephemeral' || !pvcName) {
      throw new StorageApiError('Ephemeral storage cannot be resized', 400);
    }

    let newBytes: number;
    try {
      newBytes = helpers.quantity.parseQuantity(size);
    } catch {
      throw new StorageApiError(`Invalid storage size "${size}"`, 400);
    }

    const pvc = await this.readPvc(namespace, pvcName);
    assertGrows(pvc, newBytes);

    const expandability = await this.storageClassService.getExpandability(
      pvc.spec?.storageClassName,
    );
    if (expandability === 'forbidden') {
      throw new StorageApiError('The storage class does not allow volume expansion', 400);
    }

    let patched: k8s.V1PersistentVolumeClaim;
    try {
      patched = await this.coreV1Api.patchNamespacedPersistentVolumeClaim(
        {
          namespace,
          name: pvcName,
          body: { spec: { resources: { requests: { storage: size } } } },
        },
        MERGE_PATCH_OPTIONS,
      );
    } catch (e) {
      throw toResizeError(e, pvcName);
    }
    return this.buildStorageInfo(resolution, patched);
  }
}

export function toResizeError(error: unknown, pvcName: string): StorageApiError {
  const statusCode = getStatusCode(error) || 500;
  const message = helpers.errors.getMessage(error);
  if (statusCode === 403 && QUOTA_ERROR_REGEX.test(message)) {
    return new StorageApiError(`The new size exceeds the namespace quota: ${message}`, 422);
  }
  if ((statusCode === 403 || statusCode === 422) && EXPANSION_FORBIDDEN_REGEX.test(message)) {
    return new StorageApiError('The storage class does not allow volume expansion', 400);
  }
  return new StorageApiError(
    `Unable to resize PersistentVolumeClaim "${pvcName}": ${message}`,
    statusCode,
  );
}
