/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { dump } from 'js-yaml';
import cloneDeep from 'lodash/cloneDeep';

import {
  getStorageType,
  prepareDevfile,
} from '@/components/WorkspaceProgress/CreatingSteps/Apply/Devfile/prepareDevfile';
import devfileApi from '@/services/devfileApi';
import { DEVWORKSPACE_STORAGE_TYPE_ATTR } from '@/services/devfileApi/devWorkspace/spec/template';
import { FactoryParams } from '@/services/helpers/factoryFlow/buildFactoryParams';
import { generateWorkspaceName } from '@/services/helpers/generateName';
import { che } from '@/services/models';
import {
  DEVWORKSPACE_DEVFILE_SOURCE,
  DEVWORKSPACE_METADATA_ANNOTATION,
} from '@/services/workspace-client/devworkspace/devWorkspaceClient';

jest.mock('@/services/helpers/generateName');
(generateWorkspaceName as jest.Mock).mockImplementation(name => name + '1234');

describe('FactoryLoaderContainer/prepareDevfile', () => {
  describe('DEVWORKSPACE_METADATA_ANNOTATION attribute', () => {
    test('add the attribute with annotation', () => {
      const devfile = {
        schemaVersion: '2.2.0',
        metadata: {
          generateName: 'wksp-',
        },
      } as devfileApi.Devfile;
      const factoryId = 'url=https://devfile-location';
      const factorySource = {
        [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
          factory: {
            params: factoryId,
          },
        }),
      };

      const newDevfile = prepareDevfile(devfile, factoryId, undefined, false);

      expect(newDevfile.attributes).toEqual({
        [DEVWORKSPACE_METADATA_ANNOTATION]: factorySource,
      });
    });

    test('update the attribute with annotation', () => {
      const customAnnotation = {
        'custom-annotation': 'value',
      };
      const factoryId = 'url=https://devfile-location';
      const factorySource = {
        [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
          factory: {
            params: factoryId,
          },
        }),
      };

      const devfile = {
        schemaVersion: '2.2.0',
        metadata: {
          name: 'asdf',
          generateName: 'wksp-',
        },
        attributes: {
          [DEVWORKSPACE_METADATA_ANNOTATION]: customAnnotation,
        },
      } as devfileApi.Devfile;

      const newDevfile = prepareDevfile(devfile, factoryId, undefined, false);

      expect(newDevfile.attributes?.[DEVWORKSPACE_METADATA_ANNOTATION]).toEqual(
        expect.objectContaining(customAnnotation),
      );
      expect(newDevfile.attributes?.[DEVWORKSPACE_METADATA_ANNOTATION]).toEqual(
        expect.objectContaining(factorySource),
      );
    });

    test('update the attribute with annotation - bad DEVWORKSPACE_METADATA_ANNOTATION', () => {
      const factoryId = 'url=https://devfile-location';
      const factorySource = {
        [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
          factory: {
            params: factoryId,
          },
        }),
      };

      const badMetadataAnnotation = 'bad-metadata-annotation';

      const devfile = {
        schemaVersion: '2.2.0',
        metadata: {
          generateName: 'wksp-',
          attributes: {
            [DEVWORKSPACE_METADATA_ANNOTATION]: badMetadataAnnotation,
          },
        },
      } as devfileApi.Devfile;

      const newDevfile = prepareDevfile(devfile, factoryId, undefined, false);

      expect(newDevfile.attributes?.[DEVWORKSPACE_METADATA_ANNOTATION]).not.toContain(
        badMetadataAnnotation,
      );
      expect(newDevfile.attributes?.[DEVWORKSPACE_METADATA_ANNOTATION]).toEqual(factorySource);
    });

    test('update the attribute with annotation - bad DEVWORKSPACE_DEVFILE_SOURCE', () => {
      const factoryId = 'url=https://devfile-location';
      const factorySource = {
        [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
          factory: {
            params: factoryId,
          },
        }),
      };

      const badDevworkspaceDevfileSource = {
        [DEVWORKSPACE_DEVFILE_SOURCE]: 'bad-devworkspace-devfile-source',
      };

      const devfile = {
        schemaVersion: '2.2.0',
        metadata: {
          generateName: 'wksp-',
          attributes: {
            [DEVWORKSPACE_METADATA_ANNOTATION]: badDevworkspaceDevfileSource,
          },
        },
      } as devfileApi.Devfile;

      const newDevfile = prepareDevfile(devfile, factoryId, undefined, false);

      expect(newDevfile.attributes?.[DEVWORKSPACE_METADATA_ANNOTATION]).not.toContain(
        expect.objectContaining(badDevworkspaceDevfileSource),
      );
      expect(newDevfile.attributes?.[DEVWORKSPACE_METADATA_ANNOTATION]).toEqual(factorySource);
    });
  });

  describe('DevWorkspace name', () => {
    test('should not change the name', () => {
      const factoryId = 'url=https://devfile-location';
      const devfile = {
        schemaVersion: '2.2.0',
        metadata: {
          name: 'wksp-test',
        },
      } as devfileApi.Devfile;

      const newDevfile = prepareDevfile(devfile, factoryId, undefined, false);

      expect(newDevfile.metadata.name).toEqual('wksp-test');
    });

    test('should append a suffix to the name', () => {
      const factoryId = 'url=https://devfile-location';
      const devfile = {
        schemaVersion: '2.2.0',
        metadata: {
          name: 'wksp-test',
        },
      } as devfileApi.Devfile;

      const newDevfile = prepareDevfile(devfile, factoryId, undefined, true);

      expect(newDevfile.metadata.name).toEqual('wksp-test1234');
    });

    test('should generate a new name #1', () => {
      const factoryId = 'url=https://devfile-location';
      const devfile = {
        schemaVersion: '2.2.0',
        metadata: {
          generateName: 'wksp-',
        },
      } as devfileApi.Devfile;

      const newDevfile = prepareDevfile(devfile, factoryId, undefined, false);

      expect(newDevfile.metadata.name).toEqual('wksp-1234');
    });

    test('should generate a new name #2', () => {
      const factoryId = 'url=https://devfile-location';
      const devfile = {
        schemaVersion: '2.2.0',
        metadata: {
          generateName: 'wksp-',
        },
      } as devfileApi.Devfile;

      const newDevfile = prepareDevfile(devfile, factoryId, undefined, true);

      expect(newDevfile.metadata.name).toEqual('wksp-1234');
    });
  });

  describe('storage type', () => {
    const factoryId = 'url=https://devfile-location';
    const devfile = {
      schemaVersion: '2.2.0',
      metadata: {
        name: 'wksp-test',
      },
    } as devfileApi.Devfile;

    test('default storage type', () => {
      const newDevfile = prepareDevfile(devfile, factoryId, undefined, false);

      expect(newDevfile.metadata.attributes?.[DEVWORKSPACE_STORAGE_TYPE_ATTR]).toBeUndefined();
      expect(newDevfile.attributes?.[DEVWORKSPACE_STORAGE_TYPE_ATTR]).toBeUndefined();
    });

    test('non-default storage type', () => {
      const newDevfile = prepareDevfile(devfile, factoryId, 'ephemeral', false);

      expect(newDevfile.metadata.attributes?.[DEVWORKSPACE_STORAGE_TYPE_ATTR]).toBeUndefined();
      expect(newDevfile.attributes?.[DEVWORKSPACE_STORAGE_TYPE_ATTR]).toEqual('ephemeral');
    });

    describe('has parent', () => {
      let devfile: devfileApi.Devfile;
      let parentDevfile: devfileApi.Devfile;
      // mute console logs
      console.warn = jest.fn();

      beforeEach(() => {
        devfile = {
          schemaVersion: '2.2.2',
          metadata: {
            generateName: 'nodejs',
          },
          parent: {},
        } as devfileApi.Devfile;

        parentDevfile = {
          schemaVersion: '2.2.0',
          metadata: {
            name: 'sample-using-parent',
          },
          components: [
            {
              name: 'tools',
              container: {
                env: [
                  {
                    name: 'DEVFILE_ENV_VAR',
                    value: 'true',
                  },
                ],
              },
            },
          ],
          commands: [
            {
              id: 'parent-command',
              exec: {
                label: '2. This command from the parent',
                component: 'tools',
                commandLine: 'echo "Hello from parent"',
              },
            },
          ],
        } as devfileApi.Devfile;
      });

      describe('with registryUrl', () => {
        test('with storage-type attribute', () => {
          devfile.parent!.id = 'nodejs';
          devfile.parent!.registryUrl = 'https://registry.devfile.io/';
          const _devfile = cloneDeep(devfile);

          parentDevfile.attributes = {
            'controller.devfile.io/storage-type': 'ephemeral',
          };
          const _parentDevfile = cloneDeep(parentDevfile);

          const newDevfile = prepareDevfile(
            _devfile,
            factoryId,
            'ephemeral',
            false,
            _parentDevfile,
          );

          expect(_devfile).toEqual(devfile);
          expect(_parentDevfile).toEqual(parentDevfile);
          expect(console.warn).toHaveBeenCalledWith(
            'Unable to apply controller.devfile.io/storage-type attribute.',
          );
          expect(newDevfile.attributes?.[DEVWORKSPACE_STORAGE_TYPE_ATTR]).toBeUndefined();
        });

        test('without storage-type attribute', () => {
          devfile.parent!.id = 'nodejs';
          devfile.parent!.registryUrl = 'https://registry.devfile.io/';
          const _devfile = cloneDeep(devfile);

          const _parentDevfile = cloneDeep(parentDevfile);

          const newDevfile = prepareDevfile(
            _devfile,
            factoryId,
            'ephemeral',
            false,
            _parentDevfile,
          );

          expect(_devfile).toEqual(devfile);
          expect(_parentDevfile).toEqual(parentDevfile);
          expect(newDevfile.attributes?.[DEVWORKSPACE_STORAGE_TYPE_ATTR]).toEqual('ephemeral');
        });
      });
      describe('with uri', () => {
        test('with storage-type attribute', () => {
          devfile.parent!.uri = 'https://raw.githubusercontent.com/test/devfile.yaml';
          const _devfile = cloneDeep(devfile);

          parentDevfile.attributes = {
            'controller.devfile.io/storage-type': 'ephemeral',
          };
          const _parentDevfile = cloneDeep(parentDevfile);

          const newDevfile = prepareDevfile(
            _devfile,
            factoryId,
            'ephemeral',
            false,
            _parentDevfile,
          );

          expect(_devfile).toEqual(devfile);
          expect(_parentDevfile).toEqual(parentDevfile);
          expect(console.warn).toHaveBeenCalledWith(
            'Unable to apply controller.devfile.io/storage-type attribute.',
          );
          expect(newDevfile.attributes?.[DEVWORKSPACE_STORAGE_TYPE_ATTR]).toBeUndefined();
        });

        test('without storage-type attribute', () => {
          devfile.parent!.uri = 'https://raw.githubusercontent.com/test/devfile.yaml';
          const _devfile = cloneDeep(devfile);

          const _parentDevfile = cloneDeep(parentDevfile);

          const newDevfile = prepareDevfile(
            _devfile,
            factoryId,
            'ephemeral',
            false,
            _parentDevfile,
          );

          expect(_devfile).toEqual(devfile);
          expect(_parentDevfile).toEqual(parentDevfile);
          expect(newDevfile.attributes?.[DEVWORKSPACE_STORAGE_TYPE_ATTR]).toEqual('ephemeral');
        });
      });
    });
    describe('get storageType', () => {
      beforeEach(() => {
        devfile.attributes = {};
      });
      test('apply storageType from factoryParams', () => {
        devfile.attributes = {
          [DEVWORKSPACE_STORAGE_TYPE_ATTR]: 'per-workspace',
        };
        const factoryParams = { storageType: 'ephemeral' } as FactoryParams;
        const preferredStorageType = 'per-user' as che.WorkspaceStorageType;

        const storageType = getStorageType(factoryParams, devfile, preferredStorageType);

        expect(storageType).toEqual('ephemeral');
      });

      test('apply storageType from Devfile', () => {
        devfile.attributes = {
          [DEVWORKSPACE_STORAGE_TYPE_ATTR]: 'per-workspace',
        };
        const factoryParams = {} as FactoryParams;
        const preferredStorageType = 'per-user' as che.WorkspaceStorageType;

        const storageType = getStorageType(factoryParams, devfile, preferredStorageType);

        expect(storageType).toEqual('per-workspace');
      });

      test('apply storageType from preferredStorageType', () => {
        const factoryParams = {} as FactoryParams;
        const preferredStorageType = 'per-user' as che.WorkspaceStorageType;

        const storageType = getStorageType(factoryParams, devfile, preferredStorageType);

        expect(storageType).toEqual('per-user');
      });

      test('should return undefined', () => {
        const factoryParams = {} as FactoryParams;
        const preferredStorageType = '' as che.WorkspaceStorageType;

        const storageType = getStorageType(factoryParams, devfile, preferredStorageType);

        expect(storageType).toBeUndefined();
      });
    });
  });
});
