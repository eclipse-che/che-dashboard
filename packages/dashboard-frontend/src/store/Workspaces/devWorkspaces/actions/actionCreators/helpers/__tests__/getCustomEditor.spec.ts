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

import common from '@eclipse-che/common';
import { dump, load } from 'js-yaml';

import devfileApi from '@/services/devfileApi';
import { CHE_EDITOR_YAML_PATH } from '@/services/workspace-client/helpers';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';
import {
  getCustomEditor,
  getEditorDefinition,
  isEditorDefinitionContent,
} from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers/getCustomEditor';

describe('Look for the custom editor', () => {
  let optionalFilesContent: {
    [fileName: string]: { location: string; content: string } | undefined;
  };
  let editor: devfileApi.Devfile;

  beforeEach(() => {
    optionalFilesContent = {};
    editor = buildEditor();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return undefined without optionalFilesContent', async () => {
    const store = new MockStoreBuilder().build();
    const customEditor = await getCustomEditor(
      optionalFilesContent,
      store.dispatch,
      store.getState,
    );

    expect(customEditor).toBeUndefined();
  });

  describe('inlined editor', () => {
    it('should return inlined editor without changes', async () => {
      optionalFilesContent[CHE_EDITOR_YAML_PATH] = {
        location: 'location',
        content: dump({ inline: editor }),
      };
      const store = new MockStoreBuilder().build();

      const customEditor = await getCustomEditor(
        optionalFilesContent,
        store.dispatch,
        store.getState,
      );

      expect(customEditor).toEqual(dump(editor));
    });

    it('should return an overridden devfile', async () => {
      optionalFilesContent[CHE_EDITOR_YAML_PATH] = {
        location: 'location',
        content: dump({
          inline: editor,
          override: {
            containers: [
              {
                name: 'eclipse-ide',
                memoryLimit: '1234Mi',
              },
            ],
          },
        }),
      };
      const store = new MockStoreBuilder().build();

      const customEditor = await getCustomEditor(
        optionalFilesContent,
        store.dispatch,
        store.getState,
      );

      expect(customEditor).toEqual(expect.stringContaining('memoryLimit: 1234Mi'));
    });

    it('should throw the "missing metadata.name" error message', async () => {
      // set an empty value as a name
      editor.metadata.name = '';
      optionalFilesContent[CHE_EDITOR_YAML_PATH] = {
        location: 'location',
        content: dump({ inline: editor }),
      };
      const store = new MockStoreBuilder().build();

      let errorText: string | undefined;

      try {
        await getCustomEditor(optionalFilesContent, store.dispatch, store.getState);
      } catch (e) {
        errorText = common.helpers.errors.getMessage(e);
      }

      expect(errorText).toEqual(
        'Failed to analyze the editor devfile, reason: Missing metadata.name attribute in the editor yaml file.',
      );
    });
  });

  describe('get editor by id ', () => {
    describe('from the default registry', () => {
      it('should return an editor without changes', async () => {
        optionalFilesContent[CHE_EDITOR_YAML_PATH] = {
          location: 'location',
          content: dump({
            id: 'che-incubator/che-idea/next',
          }),
        };

        const editors = [
          {
            schemaVersion: '2.1.0',
            metadata: {
              name: 'che-idea',
              namespace: 'che',
              attributes: {
                publisher: 'che-incubator',
                version: 'next',
              },
            },
            components: [
              {
                name: 'eclipse-ide',
                container: {
                  image: 'docker.io/wsskeleton/eclipse-broadway',
                  mountSources: true,
                  memoryLimit: '2048M',
                },
              },
            ],
          } as devfileApi.Devfile,
        ];
        const store = new MockStoreBuilder()
          .withDwPlugins({}, {}, false, editors, 'che-incubator/che-idea/next')
          .build();

        const customEditor = await getCustomEditor(
          optionalFilesContent,
          store.dispatch,
          store.getState,
        );

        expect(customEditor).toEqual(dump(editor));
      });

      it('should return an overridden devfile', async () => {
        optionalFilesContent[CHE_EDITOR_YAML_PATH] = {
          location: 'location',
          content: dump({
            id: 'che-incubator/che-idea/next',
            override: {
              containers: [
                {
                  name: 'eclipse-ide',
                  memoryLimit: '1234Mi',
                },
              ],
            },
          }),
        };

        const editors = [
          {
            schemaVersion: '2.1.0',
            metadata: {
              name: 'che-idea',
              namespace: 'che',
              attributes: {
                publisher: 'che-incubator',
                version: 'next',
              },
            },
            components: [
              {
                name: 'eclipse-ide',
                container: {
                  image: 'docker.io/wsskeleton/eclipse-broadway',
                  mountSources: true,
                  memoryLimit: '2048M',
                },
              },
            ],
          } as devfileApi.Devfile,
        ];

        const store = new MockStoreBuilder()
          .withDevfileRegistries({
            devfiles: {
              ['https://dummy-plugin-registry/plugins/che-incubator/che-idea/next/devfile.yaml']: {
                content: dump(editor),
              },
            },
          })
          .withDwPlugins({}, {}, false, editors, 'che-incubator/che-idea/next')
          .build();

        const customEditor = await getCustomEditor(
          optionalFilesContent,
          store.dispatch,
          store.getState,
        );

        expect(customEditor).toEqual(expect.stringContaining('memoryLimit: 1234Mi'));
      });

      it('should failed fetching editor without metadata.name attribute', async () => {
        // set an empty value as a name
        editor.metadata.name = '';
        optionalFilesContent[CHE_EDITOR_YAML_PATH] = {
          location: 'location',
          content: dump({
            id: 'che-incubator/che-idea/next',
          }),
        };

        const editors = [
          {
            schemaVersion: '2.1.0',
            metadata: {
              namespace: 'che',
              attributes: {
                publisher: 'che-incubator',
                version: 'next',
              },
            },
            components: [
              {
                name: 'eclipse-ide',
                container: {
                  image: 'docker.io/wsskeleton/eclipse-broadway',
                  mountSources: true,
                  memoryLimit: '2048M',
                },
              },
            ],
          } as devfileApi.Devfile,
        ];

        const store = new MockStoreBuilder()
          .withDevfileRegistries({
            devfiles: {
              ['https://dummy-plugin-registry/plugins/che-incubator/che-idea/next/devfile.yaml']: {
                content: dump(editor),
              },
            },
          })
          .withDwPlugins({}, {}, false, editors, 'che-incubator/che-idea/next')
          .build();

        let errorText: string | undefined;
        try {
          await getCustomEditor(optionalFilesContent, store.dispatch, store.getState);
        } catch (e) {
          errorText = common.helpers.errors.getMessage(e);
        }

        expect(errorText).toEqual(
          'Failed to fetch editor yaml by id: che-incubator/che-idea/next.',
        );
      });
    });

    describe('from the custom registry', () => {
      it('should return an editor without changes', async () => {
        optionalFilesContent[CHE_EDITOR_YAML_PATH] = {
          location: 'location',
          content: dump({
            id: 'che-incubator/che-idea/next',
            registryUrl: 'https://dummy/che-plugin-registry/main/v3',
          }),
        };
        const store = new MockStoreBuilder()
          .withDevfileRegistries({
            devfiles: {
              ['https://dummy/che-plugin-registry/main/v3/plugins/che-incubator/che-idea/next/devfile.yaml']:
                {
                  content: dump(editor),
                },
            },
          })
          .build();

        const customEditor = await getCustomEditor(
          optionalFilesContent,
          store.dispatch,
          store.getState,
        );

        expect(customEditor).toEqual(dump(editor));
      });

      it('should return an overridden devfile', async () => {
        optionalFilesContent[CHE_EDITOR_YAML_PATH] = {
          location: 'location',
          content: dump({
            id: 'che-incubator/che-idea/next',
            registryUrl: 'https://dummy/che-plugin-registry/main/v3',
            override: {
              containers: [
                {
                  name: 'eclipse-ide',
                  memoryLimit: '1234Mi',
                },
              ],
            },
          }),
        };
        const store = new MockStoreBuilder()
          .withDevfileRegistries({
            devfiles: {
              ['https://dummy/che-plugin-registry/main/v3/plugins/che-incubator/che-idea/next/devfile.yaml']:
                {
                  content: dump(editor),
                },
            },
          })
          .build();

        const customEditor = await getCustomEditor(
          optionalFilesContent,
          store.dispatch,
          store.getState,
        );

        expect(customEditor).toEqual(expect.stringContaining('memoryLimit: 1234Mi'));
      });

      it('should throw the "missing metadata.name" error message', async () => {
        // set an empty value as a name
        editor.metadata.name = '';
        optionalFilesContent[CHE_EDITOR_YAML_PATH] = {
          location: 'location',
          content: dump({
            id: 'che-incubator/che-idea/next',
            registryUrl: 'https://dummy/che-plugin-registry/main/v3',
          }),
        };
        const store = new MockStoreBuilder()
          .withDevfileRegistries({
            devfiles: {
              ['https://dummy/che-plugin-registry/main/v3/plugins/che-incubator/che-idea/next/devfile.yaml']:
                {
                  content: dump(editor),
                },
            },
          })
          .build();

        let errorText: string | undefined;
        try {
          await getCustomEditor(optionalFilesContent, store.dispatch, store.getState);
        } catch (e) {
          errorText = common.helpers.errors.getMessage(e);
        }

        expect(errorText).toEqual(
          'Failed to analyze the editor devfile, reason: Missing metadata.name attribute in the editor yaml file.',
        );
      });
    });
  });
});

describe('isEditorDefinitionContent', () => {
  it.each([
    ['an editor id', 'che-incubator/che-code/latest'],
    ['an http URL', 'http://example.com/devfile.yaml'],
    ['an https URL', 'https://example.com/devfile.yaml'],
    ['an empty string', ''],
    ['blanks', '   '],
  ])('should not take %s for a definition', (_label, value) => {
    expect(isEditorDefinitionContent(value)).toBe(false);
  });

  it.each([
    ['an editor devfile', 'schemaVersion: 2.2.2\nmetadata:\n  name: che-code\n'],
    ['a reference', 'reference: https://example.com/devfile.yaml\n'],
  ])('should take %s for a definition', (_label, value) => {
    expect(isEditorDefinitionContent(value)).toBe(true);
  });

  it('should not take a broken YAML document for a definition', () => {
    expect(isEditorDefinitionContent('metadata:\n  name: che-code\n bad-indent: true\n')).toBe(
      false,
    );
  });
});

describe('getEditorDefinition', () => {
  it('should return an editor devfile as it is', async () => {
    const editor = buildEditor();
    const store = new MockStoreBuilder().build();

    const definition = await getEditorDefinition(dump(editor), store.dispatch, store.getState);

    expect(load(definition)).toEqual(editor);
  });

  it('should resolve a reference and apply the overrides', async () => {
    const editor = buildEditor();
    const editorUrl = 'https://registry/plugins/che-incubator/che-code/insiders/devfile.yaml';
    const store = new MockStoreBuilder()
      .withDevfileRegistries({ devfiles: { [editorUrl]: { content: dump(editor) } } })
      .build();

    const definition = await getEditorDefinition(
      dump({
        reference: editorUrl,
        override: { containers: [{ name: 'eclipse-ide', memoryLimit: '2048Mi' }] },
      }),
      store.dispatch,
      store.getState,
    );

    expect((load(definition) as devfileApi.Devfile).components?.[0].container?.memoryLimit).toEqual(
      '2048Mi',
    );
  });

  it('should fail when the reference cannot be fetched', async () => {
    const editorUrl = 'https://registry/plugins/unknown/devfile.yaml';
    const store = new MockStoreBuilder()
      .withDevfileRegistries({ devfiles: { [editorUrl]: { error: 'Not Found' } } })
      .build();

    await expect(
      getEditorDefinition(dump({ reference: editorUrl }), store.dispatch, store.getState),
    ).rejects.toThrow('Not Found');
  });

  it('should fail on a definition with neither a devfile nor a reference', async () => {
    const store = new MockStoreBuilder().build();

    await expect(
      getEditorDefinition(dump({ unexpected: true }), store.dispatch, store.getState),
    ).rejects.toThrow('Missing id, reference or inline content');
  });
});

function buildEditor(): devfileApi.Devfile {
  return {
    schemaVersion: '2.1.0',
    metadata: {
      name: 'che-idea',
      namespace: 'che',
      attributes: {
        publisher: 'che-incubator',
        version: 'next',
      },
    },
    components: [
      {
        name: 'eclipse-ide',
        container: {
          image: 'docker.io/wsskeleton/eclipse-broadway',
          mountSources: true,
          memoryLimit: '2048M',
        },
      },
    ],
  };
}
