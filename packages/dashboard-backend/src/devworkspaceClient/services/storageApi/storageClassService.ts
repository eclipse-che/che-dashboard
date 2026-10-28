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

type StorageV1API = Pick<k8s.StorageV1Api, 'readStorageClass'>;

/**
 * Reads `allowVolumeExpansion` of a storage class with the user token.
 * If the user is not allowed to read storage classes, expandability is `unknown`.
 * Not cached: the result depends on the user's permissions.
 */
export class StorageClassService {
  private readonly userApi: StorageV1API;

  constructor(userKc: k8s.KubeConfig) {
    this.userApi = userKc.makeApiClient(k8s.StorageV1Api);
  }

  async getExpandability(storageClassName: string | undefined): Promise<Expandability> {
    if (!storageClassName) {
      return 'unknown';
    }

    const storageClass = await this.readStorageClass(storageClassName);
    if (!storageClass) {
      return 'unknown';
    }
    return storageClass.allowVolumeExpansion === true ? 'allowed' : 'forbidden';
  }

  private async readStorageClass(name: string): Promise<k8s.V1StorageClass | undefined> {
    try {
      return await this.userApi.readStorageClass({ name });
    } catch (e) {
      if (!isForbidden(e)) {
        logger.warn(e, `Unable to read storage class "${name}"`);
      }
      return undefined;
    }
  }
}
