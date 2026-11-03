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

import { helpers, QuotaCheckEntry, WorkspaceStorageQuotaCheck } from '@eclipse-che/common';
import * as k8s from '@kubernetes/client-node';

import { assertGrows } from '@/devworkspaceClient/services/storageApi/pvcService';
import { logger } from '@/utils/logger';

type CoreV1API = Pick<k8s.CoreV1Api, 'listNamespacedResourceQuota' | 'listNamespacedLimitRange'>;

const { formatGi, parseQuantity, GI } = helpers.quantity;

export const REQUESTS_STORAGE_KEY = 'requests.storage';

export function getStorageClassQuotaKey(storageClassName: string): string {
  return `${storageClassName}.storageclass.storage.k8s.io/requests.storage`;
}

/**
 * Validates a new PVC size against the namespace ResourceQuotas and LimitRanges,
 * read with the user token. If they can't be read or parsed, the check is `unavailable`
 * and the API server remains the source of truth on submit.
 */
export class QuotaService {
  private readonly coreV1Api: CoreV1API;

  constructor(userKc: k8s.KubeConfig) {
    this.coreV1Api = userKc.makeApiClient(k8s.CoreV1Api);
  }

  async check(
    namespace: string,
    pvc: k8s.V1PersistentVolumeClaim,
    newSize: string,
  ): Promise<WorkspaceStorageQuotaCheck> {
    const newBytes = parseQuantity(newSize);
    const currentBytes = assertGrows(pvc, newBytes);

    let quotas: k8s.V1ResourceQuota[];
    let limitRanges: k8s.V1LimitRange[];
    try {
      const [quotaList, limitRangeList] = await Promise.all([
        this.coreV1Api.listNamespacedResourceQuota({ namespace }),
        this.coreV1Api.listNamespacedLimitRange({ namespace }),
      ]);
      quotas = quotaList.items;
      limitRanges = limitRangeList.items;
    } catch (e) {
      logger.warn(e, `Unable to read the storage quota of namespace "${namespace}"`);
      return { status: 'unavailable', entries: [] };
    }

    try {
      return this.evaluate(pvc, quotas, limitRanges, newBytes, currentBytes);
    } catch (e) {
      logger.warn(e, `Unable to parse the storage quota of namespace "${namespace}"`);
      return { status: 'unavailable', entries: [] };
    }
  }

  private evaluate(
    pvc: k8s.V1PersistentVolumeClaim,
    quotas: k8s.V1ResourceQuota[],
    limitRanges: k8s.V1LimitRange[],
    newBytes: number,
    currentBytes: number,
  ): WorkspaceStorageQuotaCheck {
    const delta = newBytes - currentBytes;

    const entries: QuotaCheckEntry[] = [];
    const maxAllowedBytesCandidates: number[] = [];

    const keys = [REQUESTS_STORAGE_KEY];
    if (pvc.spec?.storageClassName) {
      keys.push(getStorageClassQuotaKey(pvc.spec.storageClassName));
    }
    for (const quota of quotas) {
      const hard = quota.status?.hard ?? quota.spec?.hard ?? {};
      const used = quota.status?.used ?? {};
      for (const key of keys) {
        if (hard[key] === undefined) {
          continue;
        }
        const hardBytes = parseQuantity(hard[key]);
        const usedBytes = used[key] !== undefined ? parseQuantity(used[key]) : 0;
        const projectedBytes = usedBytes + delta;
        entries.push({
          source: 'ResourceQuota',
          name: quota.metadata?.name ?? '',
          key,
          used: formatGi(usedBytes),
          hard: formatGi(hardBytes),
          projected: formatGi(projectedBytes),
          ok: projectedBytes <= hardBytes,
        });
        maxAllowedBytesCandidates.push(hardBytes - usedBytes + currentBytes);
      }
    }

    for (const limitRange of limitRanges) {
      for (const limit of limitRange.spec?.limits ?? []) {
        const max = limit.max?.storage;
        if (limit.type !== 'PersistentVolumeClaim' || max === undefined) {
          continue;
        }
        const maxBytes = parseQuantity(max);
        entries.push({
          source: 'LimitRange',
          name: limitRange.metadata?.name ?? '',
          key: 'max.storage',
          hard: formatGi(maxBytes),
          projected: formatGi(newBytes),
          ok: newBytes <= maxBytes,
        });
        maxAllowedBytesCandidates.push(maxBytes);
      }
    }

    const result: WorkspaceStorageQuotaCheck = {
      status: entries.every(entry => entry.ok) ? 'ok' : 'exceeded',
      entries,
    };
    if (maxAllowedBytesCandidates.length > 0) {
      // rounded down to whole gibibytes, the resize step of the Dashboard
      const maxAllowedBytes = Math.max(0, Math.min(...maxAllowedBytesCandidates));
      result.maxAllowedSize = formatGi(Math.floor(maxAllowedBytes / GI) * GI, 0);
    }
    return result;
  }
}
