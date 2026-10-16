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

import { Expandability } from '@eclipse-che/common';
import * as k8s from '@kubernetes/client-node';

import { isForbidden } from '@/devworkspaceClient/services/storageApi/errors';
import { logger } from '@/utils/logger';

export const STORAGE_CLASS_CACHE_TTL_MS = 5 * 60 * 1000;

type StorageV1API = Pick<k8s.StorageV1Api, 'readStorageClass'>;

const cache = new Map<string, { expandability: Expandability; expiresAt: number }>();

export function clearStorageClassCache(): void {
  cache.clear();
}

/**
 * Reads `allowVolumeExpansion` of a storage class. The user token is tried first,
 * the dashboard service account is used as a fallback if the user is not allowed
 * to read storage classes.
 */
export class StorageClassService {
  private readonly userApi: StorageV1API;
  private readonly serviceAccountApi: StorageV1API | undefined;

  constructor(userKc: k8s.KubeConfig, serviceAccountKc?: k8s.KubeConfig) {
    this.userApi = userKc.makeApiClient(k8s.StorageV1Api);
    this.serviceAccountApi = serviceAccountKc?.makeApiClient(k8s.StorageV1Api);
  }

  async getExpandability(storageClassName: string | undefined): Promise<Expandability> {
    if (!storageClassName) {
      return 'unknown';
    }

    const cached = cache.get(storageClassName);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.expandability;
    }

    // failures are cached as well, not to retry both identities on every poll
    const storageClass = await this.readStorageClass(storageClassName);
    let expandability: Expandability = 'unknown';
    if (storageClass) {
      expandability = storageClass.allowVolumeExpansion === true ? 'allowed' : 'forbidden';
    }
    cache.set(storageClassName, {
      expandability,
      expiresAt: Date.now() + STORAGE_CLASS_CACHE_TTL_MS,
    });
    return expandability;
  }

  private async readStorageClass(name: string): Promise<k8s.V1StorageClass | undefined> {
    try {
      return await this.userApi.readStorageClass({ name });
    } catch (e) {
      if (!isForbidden(e) || !this.serviceAccountApi) {
        logger.warn(e, `Unable to read storage class "${name}"`);
        return undefined;
      }
    }
    try {
      return await this.serviceAccountApi.readStorageClass({ name });
    } catch (e) {
      logger.warn(e, `Unable to read storage class "${name}" with the service account`);
      return undefined;
    }
  }
}
