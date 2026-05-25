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

// "external" = tests that reach out to an external OCI registry via HTTPS
// (mocked here) rather than the in-cluster backup store.
import {
  BACKUP_IMAGE_DEFAULT_TAG,
  BackupStatus,
  DEVWORKSPACE_BACKUP_ANNOTATIONS,
} from '@eclipse-che/common';

jest.mock('https');

import * as https from 'https';

import { RegistryApiService } from '@/devworkspaceClient/services/registryApi';

const mockHttpsGet = https.get as jest.Mock;

const mockCustomObjectsApi = {
  getNamespacedCustomObject: jest.fn(),
  listNamespacedCustomObject: jest.fn(),
};

const mockSaCustomObjectsApi = {
  getNamespacedCustomObject: jest.fn(),
  listNamespacedCustomObject: jest.fn(),
};

const mockCoreV1Api = {
  readNamespacedSecret: jest.fn(),
};

jest.mock('@/devworkspaceClient/services/helpers/prepareCoreV1API', () => ({
  prepareCoreV1API: jest.fn(() => mockCoreV1Api),
}));

const mockKubeConfig = {
  makeApiClient: jest.fn(() => mockCustomObjectsApi),
};

const mockSaKubeConfig = {
  makeApiClient: jest.fn(() => mockSaCustomObjectsApi),
};

describe('RegistryApiService', () => {
  let service: RegistryApiService;

  const namespace = 'user-che';

  beforeEach(() => {
    service = new RegistryApiService(mockKubeConfig as any, mockSaKubeConfig as any);
    jest.clearAllMocks();
  });


  describe('listBackupImages — external registry (quay.io) path', () => {
    const quayRegistryPath = 'quay.io/my-org/backups';

    interface MockRes {
      statusCode: number;
      headers?: Record<string, string>;
      on: jest.Mock;
    }

    function buildMockRes(
      statusCode: number,
      body: string,
      headers?: Record<string, string>,
    ): MockRes {
      const res: MockRes = {
        statusCode,
        headers,
        on: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
          if (event === 'data') handler(body);
          if (event === 'end') handler();
          return res;
        }),
      };
      return res;
    }

    /**
     * Mock the OCI catalog response (direct auth — registry accepts
     * the provided auth header on _catalog without challenge).
     * Docker v2 catalog returns full paths including org:
     * e.g. "my-org/backups/user-che/my-workspace"
     */
    function mockCatalogResponse(fullPathRepos: string[]): void {
      mockHttpsGet.mockImplementationOnce(
        (_url: unknown, _opts: unknown, callback: (res: MockRes) => void) => {
          callback(buildMockRes(200, JSON.stringify({ repositories: fullPathRepos })));
          return { on: jest.fn() };
        },
      );
    }

    function mockNetworkError(error: Error): void {
      mockHttpsGet.mockImplementationOnce(() => {
        const req: { on: jest.Mock } = {
          on: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
            if (event === 'error') handler(error);
            return req;
          }),
        };
        return req;
      });
    }

    beforeEach(() => {
      mockSaCustomObjectsApi.getNamespacedCustomObject.mockResolvedValue({
        kind: 'DevWorkspaceOperatorConfig',
        config: {
          workspace: {
            backupCronJob: {
              registry: { path: quayRegistryPath, authSecret: 'registry-secret' },
            },
          },
        },
      });
      const auth = Buffer.from('robot:token').toString('base64');
      mockCoreV1Api.readNamespacedSecret.mockResolvedValue({
        data: {
          '.dockerconfigjson': Buffer.from(
            JSON.stringify({ auths: { 'quay.io': { auth } } }),
          ).toString('base64'),
        },
      });
    });

    it('should discover deleted workspace backups from registry', async () => {
      mockCatalogResponse(['my-org/backups/user-che/deleted-ws']);
      // No DevWorkspaces exist (workspace was deleted)
      mockCustomObjectsApi.listNamespacedCustomObject.mockResolvedValue({ items: [] });

      const result = await service.listBackupImages(namespace);

      // Registry confirmed the image exists → always shown even without DW annotation
      expect(result).toHaveLength(1);
      expect(result[0].workspaceName).toBe('deleted-ws');
      expect(result[0].workspaceExists).toBe(false);
      expect(result[0].timestamp).toBeUndefined();
      expect(result[0].imageUrl).toBe(
        `${quayRegistryPath}/${namespace}/deleted-ws:${BACKUP_IMAGE_DEFAULT_TAG}`,
      );
    });

    it('should surface deleted workspace with annotation timestamp from registry', async () => {
      const deletedDWTimestamp = '2026-02-10T12:00:00.000Z';
      mockCatalogResponse(['my-org/backups/user-che/deleted-ws']);
      // DW exists with backup annotation but will be marked as not existing
      // (it's discovered via registry, not DW list)
      mockCustomObjectsApi.listNamespacedCustomObject.mockResolvedValue({
        items: [
          {
            metadata: {
              name: 'deleted-ws',
              annotations: {
                [DEVWORKSPACE_BACKUP_ANNOTATIONS.LAST_BACKUP_FINISHED_AT]: deletedDWTimestamp,
              },
            },
          },
        ],
      });

      const result = await service.listBackupImages(namespace);

      expect(result).toHaveLength(1);
      expect(result[0].workspaceName).toBe('deleted-ws');
      expect(result[0].workspaceExists).toBe(true);
      expect(result[0].timestamp).toBe(deletedDWTimestamp);
      expect(result[0].imageUrl).toBe(
        `${quayRegistryPath}/${namespace}/deleted-ws:${BACKUP_IMAGE_DEFAULT_TAG}`,
      );
    });

    it('should mark annotation-only entry as UNAVAILABLE when quay confirms image missing', async () => {
      mockCatalogResponse([]); // quay.io returns empty list
      mockCustomObjectsApi.listNamespacedCustomObject.mockResolvedValue({
        items: [
          {
            metadata: {
              name: 'orphaned-ws',
              annotations: {
                [DEVWORKSPACE_BACKUP_ANNOTATIONS.LAST_BACKUP_FINISHED_AT]: '2026-02-10T12:00:00Z',
              },
            },
          },
        ],
      });

      const result = await service.listBackupImages(namespace);

      expect(result).toHaveLength(1);
      expect(result[0].workspaceName).toBe('orphaned-ws');
      expect(result[0].labels[DEVWORKSPACE_BACKUP_ANNOTATIONS.LAST_BACKUP_SUCCESSFUL]).toBe(
        BackupStatus.UNAVAILABLE,
      );
    });

    it('should throw when HTTPS request to external registry fails with a network error', async () => {
      mockNetworkError(new Error('ECONNREFUSED'));
      mockCustomObjectsApi.listNamespacedCustomObject.mockResolvedValue({ items: [] });

      await expect(service.listBackupImages(namespace)).rejects.toThrow();
    });

    it('should merge registry and annotation data for existing workspace', async () => {
      const backupTimestamp = '2026-02-10T14:00:00Z';
      mockCatalogResponse(['my-org/backups/user-che/my-workspace']);
      mockCustomObjectsApi.listNamespacedCustomObject.mockResolvedValue({
        items: [
          {
            metadata: {
              name: 'my-workspace',
              annotations: {
                [DEVWORKSPACE_BACKUP_ANNOTATIONS.LAST_BACKUP_FINISHED_AT]: backupTimestamp,
                [DEVWORKSPACE_BACKUP_ANNOTATIONS.LAST_BACKUP_SUCCESSFUL]: 'true',
              },
            },
          },
        ],
      });

      const result = await service.listBackupImages(namespace);

      expect(result).toHaveLength(1);
      expect(result[0].workspaceName).toBe('my-workspace');
      expect(result[0].workspaceExists).toBe(true);
      expect(result[0].timestamp).toBe(backupTimestamp);
    });
  });
});
