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

import { dump } from 'js-yaml';

import devfileApi from '@/services/devfileApi';
import { fetchEditor } from '@/services/workspace-client/devworkspace/devWorkspaceEditor';

// mute console warn
console.warn = jest.fn();

const mockFetchData = jest.fn();

describe('Fetch editor by url', () => {
  let editorUrl: string;
  let editor: devfileApi.Devfile;

  beforeEach(() => {
    editorUrl = 'http://dummy-repo';
    editor = buildEditor();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return undefined if the fetchData callback throws an error', async () => {
    mockFetchData.mockRejectedValueOnce(new Error('unexpected error'));

    const customEditor = await fetchEditor(editorUrl, mockFetchData);

    expect(mockFetchData).toHaveBeenCalledTimes(1);
    expect(mockFetchData).toHaveBeenCalledWith(editorUrl);
    expect(customEditor).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(`Failed to fetch editor yaml by URL: ${editorUrl}.`);
  });

  describe('request callback returns object', () => {
    it('should return undefined if it is not a Devfile', async () => {
      delete (editor as Partial<devfileApi.Devfile>).schemaVersion;

      mockFetchData.mockResolvedValueOnce(editor);

      const customEditor = await fetchEditor(editorUrl, mockFetchData);

      expect(mockFetchData).toHaveBeenCalledTimes(1);
      expect(mockFetchData).toHaveBeenCalledWith(editorUrl);
      expect(customEditor).toBeUndefined();
    });
    it('should return the same object if it is a Devfile', async () => {
      mockFetchData.mockResolvedValueOnce(editor);

      const customEditor = await fetchEditor(editorUrl, mockFetchData);

      expect(mockFetchData).toHaveBeenCalledTimes(1);
      expect(mockFetchData).toHaveBeenCalledWith(editorUrl);
      expect(customEditor).toEqual(editor);
    });
  });

  describe('request callback returns string', () => {
    it('should return the editor object if the request callback returns it', async () => {
      const editorStr = dump(editor);
      mockFetchData.mockResolvedValueOnce(editorStr);

      const customEditor = await fetchEditor(editorUrl, mockFetchData, false);

      expect(mockFetchData).toHaveBeenCalledTimes(1);
      expect(mockFetchData).toHaveBeenCalledWith(editorUrl);
      expect(customEditor).toEqual(editor);
    });
    describe('inlined editor', () => {
      it('should return inlined editor without changes', async () => {
        const cheEditorYamlFile = dump({ inline: editor });
        mockFetchData.mockResolvedValueOnce(cheEditorYamlFile);

        const customEditor = await fetchEditor(editorUrl, mockFetchData, true);

        expect(mockFetchData).toHaveBeenCalledTimes(1);
        expect(mockFetchData).toHaveBeenCalledWith(editorUrl);
        expect(customEditor).toEqual(editor);
      });

      it('should return an overridden devfile', async () => {
        const cheEditorYamlFile = dump({
          inline: editor,
          override: {
            containers: [
              {
                name: 'eclipse-ide',
                memoryLimit: '12345Mi',
              },
            ],
          },
        });
        mockFetchData.mockResolvedValueOnce(cheEditorYamlFile);

        const customEditor = await fetchEditor(editorUrl, mockFetchData, true);

        expect(mockFetchData).toHaveBeenCalledTimes(1);
        expect(mockFetchData.mock.calls).toEqual([['http://dummy-repo']]);
        expect(customEditor).toEqual(
          expect.objectContaining({
            components: expect.arrayContaining([
              {
                name: 'eclipse-ide',
                container: expect.objectContaining({ memoryLimit: '12345Mi' }),
              },
            ]),
          }),
        );
      });
    });
    describe('get editor by id ', () => {
      describe('from the default registry', () => {
        it('should return an editor without changes if the editor fetch callback returns object', async () => {
          const cheEditorYamlFile = dump({
            id: 'che-incubator/che-idea/next',
          });
          mockFetchData.mockResolvedValueOnce(cheEditorYamlFile);
          mockFetchData.mockResolvedValueOnce(editor);

          const customEditor = await fetchEditor(editorUrl, mockFetchData, true);

          expect(mockFetchData).toHaveBeenCalledTimes(2);
          expect(mockFetchData.mock.calls).toEqual([
            ['http://dummy-repo'],
            [
              'http://127.0.0.1:8080/dashboard/api/editors/devfile?che-editor=che-incubator/che-idea/next',
            ],
          ]);
          expect(customEditor).toEqual(editor);
        });

        it('should return an editor without changes if the editor fetch callback returns string', async () => {
          const cheEditorYamlFile = dump({
            id: 'che-incubator/che-idea/next',
          });
          mockFetchData.mockResolvedValueOnce(cheEditorYamlFile);
          mockFetchData.mockResolvedValueOnce(dump(editor));

          const customEditor = await fetchEditor(editorUrl, mockFetchData, true);

          expect(mockFetchData).toHaveBeenCalledTimes(2);
          expect(mockFetchData.mock.calls).toEqual([
            ['http://dummy-repo'],
            [
              'http://127.0.0.1:8080/dashboard/api/editors/devfile?che-editor=che-incubator/che-idea/next',
            ],
          ]);
          expect(customEditor).toEqual(editor);
        });

        it('should return an overridden devfile', async () => {
          const cheEditorYamlFile = dump({
            id: 'che-incubator/che-idea/next',
            override: {
              containers: [
                {
                  name: 'eclipse-ide',
                  memoryLimit: '6789Mi',
                },
              ],
            },
          });
          mockFetchData.mockResolvedValueOnce(cheEditorYamlFile);

          mockFetchData.mockResolvedValueOnce(dump(editor));

          const customEditor = await fetchEditor(editorUrl, mockFetchData, true);

          expect(mockFetchData).toHaveBeenCalledTimes(2);
          expect(mockFetchData.mock.calls).toEqual([
            ['http://dummy-repo'],
            [
              'http://127.0.0.1:8080/dashboard/api/editors/devfile?che-editor=che-incubator/che-idea/next',
            ],
          ]);
          expect(customEditor).toEqual(
            expect.objectContaining({
              components: expect.arrayContaining([
                {
                  name: 'eclipse-ide',
                  container: expect.objectContaining({ memoryLimit: '6789Mi' }),
                },
              ]),
            }),
          );
        });
      });

      describe('from the custom registry', () => {
        it('should return an editor without changes', async () => {
          const cheEditorYamlFile = dump({
            id: 'che-incubator/che-idea/next',
            registryUrl: 'https://dummy/che-plugin-registry/main/v3',
          });
          mockFetchData.mockResolvedValueOnce(cheEditorYamlFile);
          mockFetchData.mockResolvedValueOnce(dump(editor));

          const customEditor = await fetchEditor(editorUrl, mockFetchData, true);

          expect(mockFetchData).toHaveBeenCalledTimes(2);
          expect(mockFetchData.mock.calls).toEqual([
            ['http://dummy-repo'],
            [
              'https://dummy/che-plugin-registry/main/v3/plugins/che-incubator/che-idea/next/devfile.yaml',
            ],
          ]);
          expect(customEditor).toEqual(editor);
        });

        it('should return an overridden devfile', async () => {
          const cheEditorYamlFile = dump({
            id: 'che-incubator/che-idea/next',
            registryUrl: 'https://dummy/che-plugin-registry/main/v3',
            override: {
              containers: [
                {
                  name: 'eclipse-ide',
                  memoryLimit: '4321Mi',
                },
              ],
            },
          });
          mockFetchData.mockResolvedValueOnce(cheEditorYamlFile);
          mockFetchData.mockResolvedValueOnce(dump(editor));

          const customEditor = await fetchEditor(editorUrl, mockFetchData, true);

          expect(mockFetchData).toHaveBeenCalledTimes(2);
          expect(mockFetchData.mock.calls).toEqual([
            ['http://dummy-repo'],
            [
              'https://dummy/che-plugin-registry/main/v3/plugins/che-incubator/che-idea/next/devfile.yaml',
            ],
          ]);
          expect(customEditor).toEqual(
            expect.objectContaining({
              components: expect.arrayContaining([
                {
                  name: 'eclipse-ide',
                  container: expect.objectContaining({ memoryLimit: '4321Mi' }),
                },
              ]),
            }),
          );
        });
      });
    });
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
