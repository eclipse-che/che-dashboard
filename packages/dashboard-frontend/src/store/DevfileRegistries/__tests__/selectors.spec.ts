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

import { dump, load } from 'js-yaml';

import devfileApi from '@/services/devfileApi';
import { che } from '@/services/models';
import { RootState } from '@/store';
import {
  selectDefaultDevfile,
  selectDevWorkspaceResources,
  selectEmptyWorkspaceUrl,
  selectFilterValue,
  selectIsRegistryDevfile,
  selectMetadataFiltered,
  selectRegistriesErrors,
  selectRegistriesMetadata,
} from '@/store/DevfileRegistries/selectors';
import { ServerConfigState } from '@/store/ServerConfig';

jest.mock('js-yaml', () => ({
  load: jest.fn(),
  dump: jest.fn(),
}));
jest.mock('@/store/ServerConfig/selectors', () => {
  return {
    selectDefaultComponents: jest.fn().mockReturnValue([]),
  };
});

describe('DevfileRegistries, selectors', () => {
  let mockState: RootState;

  beforeEach(() => {
    mockState = {
      dwServerConfig: {
        config: {
          defaults: {
            pvcStrategy: 'per-user',
          },
        },
      } as Partial<ServerConfigState>,
      devfileRegistries: {
        registries: {
          'https://registry1.com': {
            metadata: [
              {
                displayName: 'Devfile 1',
                description: 'Description 1',
                links: { v2: 'https://registry1.com/devfile1' },
                tags: ['tag1'],
                language: 'Java',
              } as che.DevfileMetaData,
            ],
          },
          'https://registry2.com': {
            metadata: [
              {
                displayName: 'Devfile 2',
                description: 'Description 2',
                links: { v2: 'https://registry2.com/devfile2' },
                tags: ['tag2', 'Empty'],
              } as che.DevfileMetaData,
            ],
            error: 'Error message',
          },
        },
        devfiles: {
          'https://registry2.com/devfile2': {
            content: 'devfile content',
          },
        },
        devWorkspaceResources: {
          'https://registry2.com/devfile2': {
            resources: [
              { kind: 'DevWorkspace', metadata: { name: 'workspace1' } } as devfileApi.DevWorkspace,
              {
                kind: 'DevWorkspaceTemplate',
                metadata: { name: 'template1' },
              } as devfileApi.DevWorkspaceTemplate,
            ],
          },
        },
        tagsFilter: [],
        languagesFilter: [],
        filter: 'Devfile 1',
        isLoading: false,
      },
    } as Partial<RootState> as RootState;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should select registries metadata', () => {
    const result = selectRegistriesMetadata(mockState);
    expect(result).toEqual([
      {
        displayName: 'Devfile 1',
        description: 'Description 1',
        links: { v2: 'https://registry1.com/devfile1' },
        tags: ['tag1'],
        language: 'Java',
        registry: 'https://registry1.com',
      },
      {
        displayName: 'Devfile 2',
        description: 'Description 2',
        links: { v2: 'https://registry2.com/devfile2' },
        tags: ['tag2', 'Empty'],
        registry: 'https://registry2.com',
      },
    ]);
  });

  it('should select if a URL is a registry devfile', () => {
    const result = selectIsRegistryDevfile(mockState)('https://registry2.com/devfile2');
    expect(result).toBe(true);
  });

  it('should match registry devfile URL after stripping devfilePath aliases', () => {
    const stateWithExternalSample = {
      ...mockState,
      devfileRegistries: {
        ...mockState.devfileRegistries,
        registries: {
          'https://internal-registry.com': {
            metadata: [
              {
                displayName: 'External Sample',
                description: 'Sample with devfilePath param',
                links: { v2: 'https://github.com/org/repo?df=custom-devfile.yaml' },
                tags: ['tag1'],
              } as che.DevfileMetaData,
            ],
          },
        },
      },
    } as RootState;

    const isRegistryDevfile = selectIsRegistryDevfile(stateWithExternalSample);

    // After param extraction in handleSampleCardClick, the source URL won't have ?df=...
    expect(isRegistryDevfile('https://github.com/org/repo')).toBe(true);

    // Original URL with ?df= should also match
    expect(isRegistryDevfile('https://github.com/org/repo?df=custom-devfile.yaml')).toBe(true);

    // Unrelated URLs should not match
    expect(isRegistryDevfile('https://github.com/other/repo')).toBe(false);
  });

  it('should match registry devfile URL after stripping override params', () => {
    const stateWithOverrideParams = {
      ...mockState,
      devfileRegistries: {
        ...mockState.devfileRegistries,
        registries: {
          'https://internal-registry.com': {
            metadata: [
              {
                displayName: 'Override Sample',
                description: 'Sample with override params',
                links: {
                  v2: 'https://github.com/org/repo?override.devfileFilename=my-devfile.yaml&memoryLimit=2Gi',
                },
                tags: ['tag1'],
              } as che.DevfileMetaData,
            ],
          },
        },
      },
    } as RootState;

    const isRegistryDevfile = selectIsRegistryDevfile(stateWithOverrideParams);

    // After param extraction, the source URL won't have override or factory params
    expect(isRegistryDevfile('https://github.com/org/repo')).toBe(true);
  });

  it('should handle non-URL strings in registry devfile matching', () => {
    const stateWithSshSample = {
      ...mockState,
      devfileRegistries: {
        ...mockState.devfileRegistries,
        registries: {
          'https://internal-registry.com': {
            metadata: [
              {
                displayName: 'SSH Sample',
                description: 'Sample with SSH URL',
                links: { v2: 'git@github.com:org/repo.git' },
                tags: ['tag1'],
              } as che.DevfileMetaData,
            ],
          },
        },
      },
    } as RootState;

    const isRegistryDevfile = selectIsRegistryDevfile(stateWithSshSample);

    // SSH URLs are not valid URLs for new URL(), normalizeSourceUrl should
    // fall back to returning the string as-is for exact comparison
    expect(isRegistryDevfile('git@github.com:org/repo.git')).toBe(true);
    expect(isRegistryDevfile('git@github.com:other/repo.git')).toBe(false);
  });

  it('should select registries errors', () => {
    const result = selectRegistriesErrors(mockState);
    expect(result).toEqual([
      {
        url: 'https://registry2.com',
        errorMessage: 'Error message',
      },
    ]);
  });

  it('should select filter value', () => {
    const result = selectFilterValue(mockState);
    expect(result).toEqual('Devfile 1');
  });

  describe('selectMetadataFiltered', () => {
    it('should select metadata filtered by filter value by displayName', () => {
      mockState.devfileRegistries.filter = 'Devfile 1';

      const result = selectMetadataFiltered(mockState);

      expect(result).toEqual([
        {
          displayName: 'Devfile 1',
          description: 'Description 1',
          links: { v2: 'https://registry1.com/devfile1' },
          tags: ['tag1'],
          language: 'Java',
          registry: 'https://registry1.com',
        },
      ]);
    });

    it('should select metadata filtered by filter value by description', () => {
      mockState.devfileRegistries.filter = 'Description 1';

      const result = selectMetadataFiltered(mockState);

      expect(result).toEqual([
        {
          displayName: 'Devfile 1',
          description: 'Description 1',
          links: { v2: 'https://registry1.com/devfile1' },
          tags: ['tag1'],
          language: 'Java',
          registry: 'https://registry1.com',
        },
      ]);
    });

    it('should select metadata filtered by filter value by tags', () => {
      mockState.devfileRegistries.filter = 'Empty';

      const result = selectMetadataFiltered(mockState);

      expect(result).toEqual([
        {
          displayName: 'Devfile 2',
          description: 'Description 2',
          links: { v2: 'https://registry2.com/devfile2' },
          tags: ['tag2', 'Empty'],
          registry: 'https://registry2.com',
        },
      ]);
    });

    it('should select metadata filtered by filter value by link', () => {
      mockState.devfileRegistries.filter = 'registry2.com';

      const result = selectMetadataFiltered(mockState);

      expect(result).toEqual([
        {
          displayName: 'Devfile 2',
          description: 'Description 2',
          links: { v2: 'https://registry2.com/devfile2' },
          tags: ['tag2', 'Empty'],
          registry: 'https://registry2.com',
        },
      ]);
    });

    it('should select by languages filter', () => {
      const mockStateWithoutFilterValue = {
        ...mockState,
        devfileRegistries: {
          ...mockState.devfileRegistries,
          filter: '',
          tagsFilter: [],
          languagesFilter: ['Java'],
        },
      } as RootState;

      const result = selectMetadataFiltered(mockStateWithoutFilterValue);
      expect(result).toEqual([
        {
          displayName: 'Devfile 1',
          description: 'Description 1',
          links: { v2: 'https://registry1.com/devfile1' },
          tags: ['tag1'],
          language: 'Java',
          registry: 'https://registry1.com',
        },
      ]);
    });

    it('should select by tags filter', () => {
      const mockStateWithoutFilterValue = {
        ...mockState,
        devfileRegistries: {
          ...mockState.devfileRegistries,
          filter: '',
          tagsFilter: ['tag2'],
          languagesFilter: [],
        },
      } as RootState;

      const result = selectMetadataFiltered(mockStateWithoutFilterValue);
      expect(result).toEqual([
        {
          displayName: 'Devfile 2',
          description: 'Description 2',
          links: { v2: 'https://registry2.com/devfile2' },
          tags: ['tag2', 'Empty'],
          registry: 'https://registry2.com',
        },
      ]);
    });

    it('should select all metadata if filter value is empty', () => {
      const mockStateWithoutFilterValue = {
        ...mockState,
        devfileRegistries: {
          ...mockState.devfileRegistries,
          filter: '',
          tagsFilter: [],
          languagesFilter: [],
        },
      } as RootState;

      const result = selectMetadataFiltered(mockStateWithoutFilterValue);
      expect(result).toEqual([
        {
          displayName: 'Devfile 1',
          description: 'Description 1',
          links: { v2: 'https://registry1.com/devfile1' },
          tags: ['tag1'],
          language: 'Java',
          registry: 'https://registry1.com',
        },
        {
          displayName: 'Devfile 2',
          description: 'Description 2',
          links: { v2: 'https://registry2.com/devfile2' },
          tags: ['tag2', 'Empty'],
          registry: 'https://registry2.com',
        },
      ]);
    });
  });

  it('should select empty workspace URL', () => {
    const result = selectEmptyWorkspaceUrl(mockState);
    expect(result).toEqual('https://registry2.com/devfile2');
  });

  describe('selectDefaultDevfile', () => {
    it('should select devfile without storage-type', () => {
      delete mockState.dwServerConfig.config.defaults.pvcStrategy;
      const mockDevfile = {
        schemaVersion: '2.2.0',
        metadata: {
          name: 'empty',
        },
      };
      const mockDevfileStr = 'schemaVersion: 2.2.0\nmetadata:\n  name: empty\n';

      (load as jest.Mock).mockReturnValue(mockDevfile);
      (dump as jest.Mock).mockReturnValue(mockDevfileStr);

      const result = selectDefaultDevfile(mockState);
      expect(result).toEqual(
        Object.assign({}, mockDevfile, {
          attributes: {
            'dw.metadata.annotations': {
              'che.eclipse.org/devfile': mockDevfileStr,
            },
          },
          components: [],
        }),
      );
    });
    it('should select devfile with default storage-type', () => {
      const mockDevfile = {
        schemaVersion: '2.2.0',
        metadata: {
          name: 'empty',
        },
      };
      const mockDevfileStr = 'schemaVersion: 2.2.0\nmetadata:\n  name: empty\n';

      (load as jest.Mock).mockReturnValue(mockDevfile);
      (dump as jest.Mock).mockReturnValue(mockDevfileStr);

      const result = selectDefaultDevfile(mockState);
      expect(result).toEqual(
        Object.assign({}, mockDevfile, {
          attributes: {
            'controller.devfile.io/storage-type': 'per-user',
            'dw.metadata.annotations': {
              'che.eclipse.org/devfile': mockDevfileStr,
            },
          },
          components: [],
        }),
      );
    });
    it('should select devfile with storage-type', () => {
      const mockDevfile = {
        schemaVersion: '2.2.0',
        metadata: {
          name: 'empty',
        },
        attributes: {
          'controller.devfile.io/storage-type': 'per-workspace',
        },
      };
      const mockDevfileStr = 'schemaVersion: 2.2.0\nmetadata:\n  name: empty\n';

      (load as jest.Mock).mockReturnValue(mockDevfile);
      (dump as jest.Mock).mockReturnValue(mockDevfileStr);

      const result = selectDefaultDevfile(mockState);
      expect(result).toEqual(
        Object.assign({}, mockDevfile, {
          attributes: {
            'controller.devfile.io/storage-type': 'per-workspace',
            'dw.metadata.annotations': {
              'che.eclipse.org/devfile': mockDevfileStr,
            },
          },
          components: [],
        }),
      );
    });

    it('should return undefined if the empty workspace URL is not found', () => {
      const mockStateWithoutEmptyWorkspaceUrl = {
        ...mockState,
        devfileRegistries: {
          ...mockState.devfileRegistries,
          registries: {
            'https://registry1.com':
              mockState.devfileRegistries.registries['https://registry1.com'],
          },
        },
      } as RootState;

      const result = selectDefaultDevfile(mockStateWithoutEmptyWorkspaceUrl);
      expect(result).toBeUndefined();
    });

    it('should return undefined if the devfile content is not found', () => {
      const mockStateWithoutDevfileContent = {
        ...mockState,
        devfileRegistries: {
          ...mockState.devfileRegistries,
          devfiles: {},
        },
      } as RootState;

      const result = selectDefaultDevfile(mockStateWithoutDevfileContent);
      expect(result).toBeUndefined();
    });

    it('should return undefined if the devfile content is not valid', () => {
      console.error = jest.fn();
      (load as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid devfile content');
      });

      const result = selectDefaultDevfile(mockState);
      expect(result).toBeUndefined();
    });
  });

  it('should select dev workspace resources', () => {
    const result = selectDevWorkspaceResources(mockState);
    expect(result).toEqual({
      'https://registry2.com/devfile2': {
        resources: [
          { kind: 'DevWorkspace', metadata: { name: 'workspace1' } },
          { kind: 'DevWorkspaceTemplate', metadata: { name: 'template1' } },
        ],
      },
    });
  });
});
