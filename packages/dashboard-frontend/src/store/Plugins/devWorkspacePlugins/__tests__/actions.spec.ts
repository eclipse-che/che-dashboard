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

import common from '@eclipse-che/common';
import { load } from 'js-yaml';

import { fetchEditors } from '@/services/backend-client/editorsApi';
import devfileApi from '@/services/devfileApi';
import { fetchDevfile } from '@/services/registry/devfiles';
import { fetchData } from '@/services/registry/fetchData';
import { RootState } from '@/store';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import {
  actionCreators,
  dwDefaultEditorErrorAction,
  dwDefaultEditorReceiveAction,
  dwDefaultEditorRequestAction,
  dwDefaultPluginsReceiveAction,
  dwDefaultPluginsRequestAction,
  dwEditorErrorAction,
  dwEditorReceiveAction,
  dwEditorRequestAction,
  dwEditorsErrorAction,
  dwEditorsReceiveAction,
  dwEditorsRequestAction,
  dwPluginErrorAction,
  dwPluginReceiveAction,
  dwPluginRequestAction,
} from '@/store/Plugins/devWorkspacePlugins/actions';
import { verifyAuthorized } from '@/store/SanityCheck';
import { ServerConfigState } from '@/store/ServerConfig';

jest.mock('@eclipse-che/common');
jest.mock('@/services/backend-client/editorsApi');
jest.mock('@/services/devfileApi');
jest.mock('@/services/registry/devfiles');
jest.mock('@/services/registry/fetchData');
jest.mock('@/store/SanityCheck');
jest.mock('js-yaml');

describe('Plugins Actions', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore({});
    jest.clearAllMocks();
  });

  describe('requestDwDevfile', () => {
    it('should dispatch receive action on successful fetch', async () => {
      const mockUrl = 'https://example.com/devfile.yaml';
      const mockDevfileContent = 'mock devfile content';
      const mockDevfile = { metadata: { name: 'mock-devfile' } } as devfileApi.Devfile;

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchDevfile as jest.Mock).mockResolvedValue(mockDevfileContent);
      (load as jest.Mock).mockReturnValue(mockDevfile);

      await store.dispatch(actionCreators.requestDwDevfile(mockUrl));

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(dwPluginRequestAction(mockUrl));
      expect(actions[1]).toEqual(dwPluginReceiveAction({ url: mockUrl, plugin: mockDevfile }));
    });

    it('should dispatch error action on failed fetch', async () => {
      const mockUrl = 'https://example.com/devfile.yaml';
      const errorMessage = 'Network error';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchDevfile as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (common.helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.requestDwDevfile(mockUrl))).rejects.toThrow(
        errorMessage,
      );

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(dwPluginRequestAction(mockUrl));
      expect(actions[1]).toEqual(dwPluginErrorAction({ url: mockUrl, error: errorMessage }));
    });
  });

  describe('requestEditors', () => {
    it('should dispatch receive action on successful fetch', async () => {
      const mockEditors = [
        { metadata: { name: 'editor1', attributes: { publisher: 'publisher1', version: '1.0' } } },
        { metadata: { name: 'editor2', attributes: { publisher: 'publisher2' } } },
      ] as devfileApi.Devfile[];

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchEditors as jest.Mock).mockResolvedValue(mockEditors);
      jest.spyOn(console, 'warn').mockImplementation(() => {});

      await store.dispatch(actionCreators.requestEditors());

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(dwEditorsRequestAction());
      expect(actions[1]).toEqual(dwEditorsReceiveAction([mockEditors[0]]));
      expect(console.warn).toHaveBeenCalledWith(
        `Missing metadata attributes in the editor yaml file: ${mockEditors[1].metadata.name}. metadata.name, metadata.attributes.publisher and metadata.attributes.version should be set. Skipping this editor.`,
      );
    });

    it('should dispatch error action on failed fetch', async () => {
      const errorMessage = 'Network error';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchEditors as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (common.helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.requestEditors())).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(dwEditorsRequestAction());
      expect(actions[1]).toEqual(dwEditorsErrorAction(errorMessage));
    });
  });

  describe('requestDwEditor', () => {
    it('should dispatch receive action on successful fetch by URL', async () => {
      const mockEditorName = 'https://example.com/editor.yaml';
      const mockEditorContent = 'mock editor content';
      const mockEditor = { metadata: { name: 'mock-editor' } } as devfileApi.Devfile;

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchData as jest.Mock).mockResolvedValue(mockEditorContent);
      (load as jest.Mock).mockReturnValue(mockEditor);

      await store.dispatch(actionCreators.requestDwEditor(mockEditorName));

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(
        dwEditorRequestAction({ editorName: mockEditorName, url: mockEditorName }),
      );
      expect(actions[1]).toEqual(
        dwEditorReceiveAction({
          editorName: mockEditorName,
          url: mockEditorName,
          plugin: mockEditor,
        }),
      );
    });

    it('should dispatch error action on failed fetch by URL', async () => {
      const mockEditorName = 'https://example.com/editor.yaml';
      const errorMessage = 'Network error';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchData as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (common.helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.requestDwEditor(mockEditorName))).rejects.toThrow(
        errorMessage,
      );

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(
        dwEditorRequestAction({ editorName: mockEditorName, url: mockEditorName }),
      );
      expect(actions[1]).toEqual(
        dwEditorErrorAction({
          editorName: mockEditorName,
          url: mockEditorName,
          error: `Failed to load the editor ${mockEditorName}. Invalid devfile. Check 'che-editor' param.`,
        }),
      );
    });

    it('should dispatch receive action on successful fetch by editor name', async () => {
      const mockEditorName = 'publisher1/editor1/1.0';
      const mockEditor = {
        metadata: { name: 'editor1', attributes: { publisher: 'publisher1', version: '1.0' } },
      } as devfileApi.Devfile;

      const storeWithDwPlugins = createMockStore({
        dwPlugins: {
          cmEditors: [mockEditor],
          plugins: {},
          defaultPlugins: {},
          editors: {},
          isLoading: false,
        },
      });

      await storeWithDwPlugins.dispatch(actionCreators.requestDwEditor(mockEditorName));

      const actions = storeWithDwPlugins.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(
        dwEditorReceiveAction({ editorName: mockEditorName, url: '', plugin: mockEditor }),
      );
    });

    it('should dispatch error action on failed fetch by editor name', async () => {
      const mockEditorName = 'publisher1/editor1/1.0';

      const storeWithDwPlugins = createMockStore({
        dwPlugins: {
          cmEditors: [],
          plugins: {},
          defaultPlugins: {},
          editors: {},
          isLoading: false,
        },
      });

      await expect(
        storeWithDwPlugins.dispatch(actionCreators.requestDwEditor(mockEditorName)),
      ).rejects.toThrow(
        `Failed to load editor ${mockEditorName}. The editor does not exist in the editors configuration map.`,
      );

      const actions = storeWithDwPlugins.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(
        dwEditorErrorAction({
          editorName: mockEditorName,
          url: '',
          error: `Failed to load editor ${mockEditorName}. The editor does not exist in the editors configuration map.`,
        }),
      );
    });
  });

  describe('requestDwDefaultEditor', () => {
    it('should dispatch receive action on successful fetch', async () => {
      const mockDefaultEditor = 'publisher1/editor1/1.0';
      const mockEditor = {
        metadata: { name: 'editor1', attributes: { publisher: 'publisher1', version: '1.0' } },
      } as devfileApi.Devfile;

      const storeWithDwPlugins = createMockStore({
        dwServerConfig: {
          config: {
            defaults: {
              editor: mockDefaultEditor,
            },
          },
        },
        dwPlugins: {
          cmEditors: [mockEditor],
        },
      } as unknown as RootState);

      await storeWithDwPlugins.dispatch(actionCreators.requestDwDefaultEditor());

      const actions = storeWithDwPlugins.getActions();
      expect(actions).toHaveLength(3);
      expect(actions[0]).toEqual(dwDefaultEditorRequestAction());
      expect(actions[1]).toEqual(
        dwEditorReceiveAction({ editorName: mockDefaultEditor, url: '', plugin: mockEditor }),
      );
      expect(actions[2]).toEqual(
        dwDefaultEditorReceiveAction({
          url: '',
          defaultEditorName: mockDefaultEditor,
        }),
      );
    });

    it('should dispatch error action if default editor is not provided', async () => {
      const storeWithServerConfig = createMockStore({
        dwServerConfig: {
          config: {
            defaults: {},
          },
        } as ServerConfigState,
      });

      await expect(
        storeWithServerConfig.dispatch(actionCreators.requestDwDefaultEditor()),
      ).rejects.toThrow(
        'Failed to load the default editor, reason: default editor ID is not provided by Che server.',
      );

      const actions = storeWithServerConfig.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(dwDefaultEditorRequestAction());
      expect(actions[1]).toEqual(
        dwDefaultEditorErrorAction(
          'Failed to load the default editor, reason: default editor ID is not provided by Che server.',
        ),
      );
    });
  });

  describe('requestDwDefaultPlugins', () => {
    it('should dispatch receive action on successful fetch', async () => {
      const mockDefaultPlugins = {
        editor1: ['plugin1', 'plugin2'],
        editor2: ['plugin3'],
      };

      const storeWithServerConfig = createMockStore({
        dwServerConfig: {
          config: {
            defaults: {
              plugins: [
                { editor: 'editor1', plugins: ['plugin1', 'plugin2'] },
                { editor: 'editor2', plugins: ['plugin3'] },
              ],
            },
          },
        },
      } as unknown as RootState);

      await storeWithServerConfig.dispatch(actionCreators.requestDwDefaultPlugins());

      const actions = storeWithServerConfig.getActions();
      expect(actions[0]).toEqual(dwDefaultPluginsRequestAction());
      expect(actions[1]).toEqual(dwDefaultPluginsReceiveAction(mockDefaultPlugins));
    });
  });
});
