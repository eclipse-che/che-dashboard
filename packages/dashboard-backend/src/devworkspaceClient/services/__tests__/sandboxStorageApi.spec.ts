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

import * as mockClient from '@kubernetes/client-node';
import { CoreV1Api, V1PersistentVolumeClaim } from '@kubernetes/client-node';

import {
  buildClaimName,
  readManagedClaimName,
  SANDBOX_CLAIM_LABEL,
  SANDBOX_CLAIM_SIZE,
  SANDBOX_STORAGE_VOLUME,
  SandboxStorageApiService,
} from '@/devworkspaceClient/services/sandboxStorageApi';
import { ISandbox } from '@/devworkspaceClient/types';

jest.mock('@/devworkspaceClient/services/helpers/retryableExec.ts');
jest.mock('@/utils/logger');

const namespace = 'user-che';
const sandboxName = 'hello-world';
const claimName = 'sandbox-hello-world';

/** An error shaped the way the client library reports one. */
function apiError(code: number): Error {
  return Object.assign(new Error(`Failed with ${code}`), {
    code,
    headers: {},
    body: { message: 'nope' },
  });
}

function claim(overrides: Partial<V1PersistentVolumeClaim> = {}): V1PersistentVolumeClaim {
  return {
    metadata: { name: claimName, namespace, labels: { [SANDBOX_CLAIM_LABEL]: sandboxName } },
    ...overrides,
  };
}

function sandbox(metadata: Record<string, string> = { uid: 'sandbox-uid' }): ISandbox {
  return { metadata: { name: sandboxName, namespace, ...metadata } } as ISandbox;
}

describe('readManagedClaimName', () => {
  it('reads the claim the dashboard would have made', () => {
    const spec = {
      podTemplate: {
        spec: {
          volumes: [{ name: SANDBOX_STORAGE_VOLUME, persistentVolumeClaim: { claimName } }],
        },
      },
    };

    expect(readManagedClaimName(spec, sandboxName)).toBe(claimName);
  });

  it('leaves a claim the user manages alone', () => {
    const spec = {
      podTemplate: {
        spec: {
          volumes: [
            { name: SANDBOX_STORAGE_VOLUME, persistentVolumeClaim: { claimName: 'my-own' } },
          ],
        },
      },
    };

    expect(readManagedClaimName(spec, sandboxName)).toBeUndefined();
  });

  it('ignores a volume of some other name', () => {
    const spec = {
      podTemplate: { spec: { volumes: [{ name: 'cache', persistentVolumeClaim: { claimName } }] } },
    };

    expect(readManagedClaimName(spec, sandboxName)).toBeUndefined();
  });

  it.each([
    ['no spec', undefined],
    ['no pod template', {}],
    ['no volumes', { podTemplate: { spec: {} } }],
    ['an emptyDir', { podTemplate: { spec: { volumes: [{ name: SANDBOX_STORAGE_VOLUME }] } } }],
    ['volumes that are not a list', { podTemplate: { spec: { volumes: 'all of them' } } }],
    ['a pod template that is not an object', { podTemplate: 'yes please' }],
  ])('finds nothing to provision for %s', (_label, spec) => {
    expect(readManagedClaimName(spec as Record<string, unknown>, sandboxName)).toBeUndefined();
  });
});

describe('Sandbox Storage API Service', () => {
  let service: SandboxStorageApiService;

  const stubCoreV1Api = {
    readNamespacedPersistentVolumeClaim: () => Promise.resolve(claim()),
    createNamespacedPersistentVolumeClaim: () => Promise.resolve(claim()),
    patchNamespacedPersistentVolumeClaim: () => Promise.resolve(claim()),
    deleteNamespacedPersistentVolumeClaim: () => Promise.resolve(undefined),
  } as unknown as CoreV1Api;

  const spyRead = jest.spyOn(stubCoreV1Api, 'readNamespacedPersistentVolumeClaim');
  const spyCreate = jest.spyOn(stubCoreV1Api, 'createNamespacedPersistentVolumeClaim');
  const spyPatch = jest.spyOn(stubCoreV1Api, 'patchNamespacedPersistentVolumeClaim');
  const spyDelete = jest.spyOn(stubCoreV1Api, 'deleteNamespacedPersistentVolumeClaim');

  beforeEach(() => {
    const { KubeConfig } = mockClient;
    const kubeConfig = new KubeConfig();
    kubeConfig.makeApiClient = jest.fn().mockImplementation(() => stubCoreV1Api);
    service = new SandboxStorageApiService(kubeConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('buildClaimName', () => {
    it('names the claim after the sandbox, as the browser does', () => {
      expect(buildClaimName(sandboxName)).toBe(claimName);
    });
  });

  describe('ensureClaim', () => {
    it('asks for storage every cluster can provide', async () => {
      spyRead.mockRejectedValueOnce(apiError(404));

      const created = await service.ensureClaim(namespace, sandboxName, claimName);

      expect(created).toBe(true);
      expect(spyCreate).toHaveBeenCalledWith({
        namespace,
        body: expect.objectContaining({
          metadata: expect.objectContaining({
            name: claimName,
            labels: { [SANDBOX_CLAIM_LABEL]: sandboxName },
          }),
          spec: {
            accessModes: ['ReadWriteOnce'],
            resources: { requests: { storage: SANDBOX_CLAIM_SIZE } },
          },
        }),
      });
    });

    it('leaves the claim of a sandbox that is being resumed as it is', async () => {
      const created = await service.ensureClaim(namespace, sandboxName, claimName);

      expect(created).toBe(false);
      expect(spyCreate).not.toHaveBeenCalled();
    });

    it('reports no creation when another request won the race', async () => {
      spyRead.mockRejectedValueOnce(apiError(404));
      spyCreate.mockRejectedValueOnce(apiError(409));

      // Both requests wanted the claim to exist, and it does.
      await expect(service.ensureClaim(namespace, sandboxName, claimName)).resolves.toBe(false);
    });

    it('reports a read it was not allowed to make', async () => {
      spyRead.mockRejectedValueOnce(apiError(403));

      await expect(service.ensureClaim(namespace, sandboxName, claimName)).rejects.toThrow(
        'Unable to read persistent volume claim',
      );
    });

    it('reports a quota the namespace has run out of', async () => {
      spyRead.mockRejectedValueOnce(apiError(404));
      spyCreate.mockRejectedValueOnce(apiError(403));

      await expect(service.ensureClaim(namespace, sandboxName, claimName)).rejects.toThrow(
        'Unable to create persistent volume claim',
      );
    });
  });

  describe('adoptClaim', () => {
    it('hands the claim to the sandbox, so any deletion takes it along', async () => {
      await service.adoptClaim(namespace, sandbox());

      expect(spyPatch).toHaveBeenCalledWith(
        {
          namespace,
          name: claimName,
          body: {
            metadata: {
              ownerReferences: [
                {
                  apiVersion: 'agents.x-k8s.io/v1beta1',
                  kind: 'Sandbox',
                  name: sandboxName,
                  uid: 'sandbox-uid',
                  blockOwnerDeletion: false,
                },
              ],
            },
          },
        },
        expect.anything(),
      );
    });

    it('does nothing for a sandbox the API server gave no uid', async () => {
      await service.adoptClaim(namespace, sandbox({}));

      expect(spyPatch).not.toHaveBeenCalled();
    });

    it('keeps quiet about a failed patch, the sandbox having its storage either way', async () => {
      spyPatch.mockRejectedValueOnce(apiError(403));

      await expect(service.adoptClaim(namespace, sandbox())).resolves.toBeUndefined();
    });
  });

  describe('deleteClaim', () => {
    it('removes the claim it provisioned', async () => {
      await service.deleteClaim(namespace, sandboxName);

      expect(spyDelete).toHaveBeenCalledWith({ namespace, name: claimName });
    });

    it('keeps a claim that carries no label of ours', async () => {
      spyRead.mockResolvedValueOnce(claim({ metadata: { name: claimName, namespace } }));

      await service.deleteClaim(namespace, sandboxName);

      expect(spyDelete).not.toHaveBeenCalled();
    });

    it('keeps a claim labelled for another sandbox', async () => {
      spyRead.mockResolvedValueOnce(
        claim({
          metadata: { name: claimName, namespace, labels: { [SANDBOX_CLAIM_LABEL]: 'other' } },
        }),
      );

      await service.deleteClaim(namespace, sandboxName);

      expect(spyDelete).not.toHaveBeenCalled();
    });

    it('is content with a claim that is already gone', async () => {
      spyRead.mockRejectedValueOnce(apiError(404));

      await service.deleteClaim(namespace, sandboxName);

      expect(spyDelete).not.toHaveBeenCalled();
    });

    it('is content with a claim deleted while it was reading it', async () => {
      spyDelete.mockRejectedValueOnce(apiError(404));

      await expect(service.deleteClaim(namespace, sandboxName)).resolves.toBeUndefined();
    });

    it('reports a deletion it was not allowed to make', async () => {
      spyDelete.mockRejectedValueOnce(apiError(403));

      await expect(service.deleteClaim(namespace, sandboxName)).rejects.toThrow(
        'Unable to delete persistent volume claim',
      );
    });
  });
});
