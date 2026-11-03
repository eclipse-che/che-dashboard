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

import {
  buildApiException,
  buildPvc,
  namespace,
} from '@/devworkspaceClient/services/storageApi/__tests__/fixtures';
import { QuotaService } from '@/devworkspaceClient/services/storageApi/quotaService';

function buildQuota(
  name: string,
  hard: Record<string, string>,
  used: Record<string, string>,
): k8s.V1ResourceQuota {
  return { metadata: { name }, spec: { hard }, status: { hard, used } };
}

function buildLimitRange(name: string, maxStorage: string): k8s.V1LimitRange {
  return {
    metadata: { name },
    spec: {
      limits: [
        { type: 'Container', max: { memory: '4Gi' } },
        { type: 'PersistentVolumeClaim', max: { storage: maxStorage } },
      ],
    },
  };
}

describe('QuotaService', () => {
  const mockListQuotas = jest.fn();
  const mockListLimitRanges = jest.fn();
  let service: QuotaService;

  const pvc = buildPvc({ requested: '10Gi', storageClassName: 'fast' });

  beforeEach(() => {
    const kc = new k8s.KubeConfig();
    kc.makeApiClient = jest.fn().mockReturnValue({
      listNamespacedResourceQuota: mockListQuotas,
      listNamespacedLimitRange: mockListLimitRanges,
    });
    service = new QuotaService(kc);

    mockListQuotas.mockResolvedValue({ items: [] });
    mockListLimitRanges.mockResolvedValue({ items: [] });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should return ok without quotas', async () => {
    const result = await service.check(namespace, pvc, '15Gi');

    expect(mockListQuotas).toHaveBeenCalledWith({ namespace });
    expect(mockListLimitRanges).toHaveBeenCalledWith({ namespace });
    expect(result).toEqual({ status: 'ok', entries: [] });
  });

  it('should return ok when requests.storage is within limits', async () => {
    mockListQuotas.mockResolvedValue({
      items: [
        buildQuota('storage', { 'requests.storage': '50Gi' }, { 'requests.storage': '20Gi' }),
      ],
    });

    const result = await service.check(namespace, pvc, '15Gi');

    expect(result).toEqual({
      status: 'ok',
      entries: [
        {
          source: 'ResourceQuota',
          name: 'storage',
          key: 'requests.storage',
          used: '20Gi',
          hard: '50Gi',
          projected: '25Gi',
          ok: true,
        },
      ],
      // 50 - 20 + 10
      maxAllowedSize: '40Gi',
    });
  });

  it('should return exceeded when the per-storage-class key is exceeded', async () => {
    mockListQuotas.mockResolvedValue({
      items: [
        buildQuota(
          'storage',
          {
            'requests.storage': '100Gi',
            'fast.storageclass.storage.k8s.io/requests.storage': '50Gi',
            'slow.storageclass.storage.k8s.io/requests.storage': '1Gi',
          },
          {
            'requests.storage': '48Gi',
            'fast.storageclass.storage.k8s.io/requests.storage': '48Gi',
          },
        ),
      ],
    });

    const result = await service.check(namespace, pvc, '15Gi');

    expect(result.status).toEqual('exceeded');
    expect(result.entries).toEqual([
      expect.objectContaining({ key: 'requests.storage', ok: true }),
      expect.objectContaining({
        key: 'fast.storageclass.storage.k8s.io/requests.storage',
        used: '48Gi',
        hard: '50Gi',
        projected: '53Gi',
        ok: false,
      }),
    ]);
    // 50 - 48 + 10
    expect(result.maxAllowedSize).toEqual('12Gi');
  });

  it('should return exceeded when LimitRange max.storage is exceeded', async () => {
    mockListLimitRanges.mockResolvedValue({ items: [buildLimitRange('limits', '12Gi')] });

    const result = await service.check(namespace, pvc, '15Gi');

    expect(result).toEqual({
      status: 'exceeded',
      entries: [
        {
          source: 'LimitRange',
          name: 'limits',
          key: 'max.storage',
          hard: '12Gi',
          projected: '15Gi',
          ok: false,
        },
      ],
      maxAllowedSize: '12Gi',
    });
  });

  it('should use the strictest constraint as maxAllowedSize', async () => {
    mockListQuotas.mockResolvedValue({
      items: [
        buildQuota('a', { 'requests.storage': '100Gi' }, { 'requests.storage': '20Gi' }),
        buildQuota('b', { 'requests.storage': '60Gi' }, { 'requests.storage': '40Gi' }),
      ],
    });
    mockListLimitRanges.mockResolvedValue({ items: [buildLimitRange('limits', '35Gi')] });

    const result = await service.check(namespace, pvc, '15Gi');

    expect(result.status).toEqual('ok');
    // a: 90Gi, b: 30Gi, limits: 35Gi
    expect(result.maxAllowedSize).toEqual('30Gi');
  });

  it('should round maxAllowedSize down to whole gibibytes', async () => {
    mockListQuotas.mockResolvedValue({
      items: [buildQuota('q', { 'requests.storage': '50G' }, { 'requests.storage': '20Gi' })],
    });

    const result = await service.check(namespace, pvc, '15Gi');

    // 50G = 46.57Gi → 46.57 - 20 + 10 = 36.57Gi
    expect(result.maxAllowedSize).toEqual('36Gi');
  });

  it('should treat missing usage as zero', async () => {
    const quota: k8s.V1ResourceQuota = {
      metadata: { name: 'q' },
      spec: { hard: { 'requests.storage': '20Gi' } },
    };
    mockListQuotas.mockResolvedValue({ items: [quota] });

    const result = await service.check(namespace, pvc, '15Gi');

    expect(result.entries[0]).toEqual(
      expect.objectContaining({ used: '0Gi', projected: '5Gi', ok: true }),
    );
  });

  it('should tolerate sparse objects', async () => {
    const sparsePvc: k8s.V1PersistentVolumeClaim = { metadata: { name: 'claim' } };
    mockListQuotas.mockResolvedValue({
      items: [{}, { spec: { hard: { 'requests.storage': '20Gi' } } }],
    });
    mockListLimitRanges.mockResolvedValue({
      items: [
        {},
        { spec: { limits: [{ type: 'PersistentVolumeClaim', max: { storage: '30Gi' } }] } },
      ],
    });

    const result = await service.check(namespace, sparsePvc, '15Gi');

    expect(result).toEqual({
      status: 'ok',
      entries: [
        {
          source: 'ResourceQuota',
          name: '',
          key: 'requests.storage',
          used: '0Gi',
          hard: '20Gi',
          projected: '15Gi',
          ok: true,
        },
        {
          source: 'LimitRange',
          name: '',
          key: 'max.storage',
          hard: '30Gi',
          projected: '15Gi',
          ok: true,
        },
      ],
      maxAllowedSize: '20Gi',
    });
  });

  it.each([
    ['ResourceQuota', mockListQuotas],
    ['LimitRange', mockListLimitRanges],
  ])('should return unavailable on 403 while listing %s', async (_kind, mock) => {
    mock.mockRejectedValue(buildApiException(403, 'forbidden'));

    await expect(service.check(namespace, pvc, '15Gi')).resolves.toEqual({
      status: 'unavailable',
      entries: [],
    });
  });

  it.each([
    ['ResourceQuota hard', 'lots', '20Gi', '30Gi'],
    ['ResourceQuota used', '50Gi', 'lots', '30Gi'],
    ['LimitRange max', '50Gi', '20Gi', 'lots'],
  ])('should return unavailable on an unparseable %s', async (_kind, hard, used, max) => {
    mockListQuotas.mockResolvedValue({
      items: [buildQuota('storage', { 'requests.storage': hard }, { 'requests.storage': used })],
    });
    mockListLimitRanges.mockResolvedValue({ items: [buildLimitRange('limits', max)] });

    await expect(service.check(namespace, pvc, '15Gi')).resolves.toEqual({
      status: 'unavailable',
      entries: [],
    });
  });

  it.each(['10Gi', '5Gi'])('should return 400 for a new size of %s, not larger', async size => {
    await expect(service.check(namespace, pvc, size)).rejects.toMatchObject({ statusCode: 400 });
    expect(mockListQuotas).not.toHaveBeenCalled();
  });
});
