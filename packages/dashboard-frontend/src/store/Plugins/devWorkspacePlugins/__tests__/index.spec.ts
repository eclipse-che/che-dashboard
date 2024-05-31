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

import { api } from '@eclipse-che/common';
import mockAxios, { AxiosError } from 'axios';
import { AnyAction } from 'redux';
import { MockStoreEnhanced } from 'redux-mock-store';
import { ThunkDispatch } from 'redux-thunk';

import devfileApi from '@/services/devfileApi';
import { AppState } from '@/store';
import { FakeStoreBuilder } from '@/store/__mocks__/storeBuilder';
import { AUTHORIZED } from '@/store/sanityCheckMiddleware';

import * as dwPluginsStore from '..';

// mute the outputs
console.error = jest.fn();

const mockFetchDevfile = jest.fn();
jest.mock('@/services/registry/devfiles', () => ({
  fetchDevfile: (...args: unknown[]) => mockFetchDevfile(...args),
}));

const mockFetchData = jest.fn();
jest.mock('@/services/registry/fetchData', () => ({
  fetchData: (...args: unknown[]) => mockFetchData(...args),
}));

const mockFetchEditors = jest.fn();
jest.mock('@/services/backend-client/editorsApi', () => ({
  fetchEditors: (...args: unknown[]) => mockFetchEditors(...args),
}));

const plugin = {
  schemaVersion: '2.1.0',
  metadata: {
    name: 'void-sample',
  },
} as devfileApi.Devfile;

const editors = [
  {
    metadata: {
      name: 'default-editor',
      attributes: {
        publisher: 'che-incubator',
        version: 'latest',
      },
    },
    schemaVersion: '2.2.2',
  } as devfileApi.Devfile,
  {
    metadata: {
      name: 'che-code',
      attributes: {
        publisher: 'che-incubator',
        version: 'insiders',
      },
    },
    schemaVersion: '2.2.2',
  } as devfileApi.Devfile,
];

describe('dwPlugins store', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('actions', () => {
    it('should create REQUEST_EDITORS and RECEIVE_EDITORS when fetching editors from the ConfigMap', async () => {
      mockFetchEditors.mockResolvedValueOnce(editors);

      const store = new FakeStoreBuilder()
        .withDwServerConfig({
          defaults: {
            editor: 'che-incubator/default-editor/latest',
          },
        } as api.IServerConfig)
        .build() as MockStoreEnhanced<
        AppState,
        ThunkDispatch<AppState, undefined, dwPluginsStore.KnownAction>
      >;

      await store.dispatch(dwPluginsStore.actionCreators.requestEditors());

      const actions = store.getActions();

      const expectedActions: dwPluginsStore.KnownAction[] = [
        {
          type: 'REQUEST_EDITORS',
        },
        {
          type: 'RECEIVE_EDITORS',
          editors: editors,
        },
      ];

      expect(actions).toEqual(expectedActions);
    });

    it('should filter editors from ConfigMap and exclude one without metadata.name', async () => {
      const editors = [
        {
          metadata: {
            attributes: {
              publisher: 'che-incubator',
              version: 'latest',
            },
          },
          schemaVersion: '2.2.2',
        } as devfileApi.Devfile,
        {
          metadata: {
            name: 'che-code',
            attributes: {
              publisher: 'che-incubator',
              version: 'insiders',
            },
          },
          schemaVersion: '2.2.2',
        } as devfileApi.Devfile,
      ];

      mockFetchEditors.mockResolvedValueOnce(editors);

      const store = new FakeStoreBuilder()
        .withDwServerConfig({
          defaults: {
            editor: 'che-incubator/default-editor/latest',
          },
        } as api.IServerConfig)
        .build() as MockStoreEnhanced<
        AppState,
        ThunkDispatch<AppState, undefined, dwPluginsStore.KnownAction>
      >;

      await store.dispatch(dwPluginsStore.actionCreators.requestEditors());

      const actions = store.getActions();

      const expectedEditors = [
        {
          metadata: {
            name: 'che-code',
            attributes: {
              publisher: 'che-incubator',
              version: 'insiders',
            },
          },
          schemaVersion: '2.2.2',
        } as devfileApi.Devfile,
      ];

      const expectedActions: dwPluginsStore.KnownAction[] = [
        {
          type: 'REQUEST_EDITORS',
        },
        {
          type: 'RECEIVE_EDITORS',
          editors: expectedEditors,
        },
      ];

      expect(actions).toEqual(expectedActions);
    });

    it('should filter editors from ConfigMap and exclude one without metadata.attributes.publisher', async () => {
      const editors = [
        {
          metadata: {
            name: 'che-idea',
            attributes: {
              version: 'latest',
            },
          },
          schemaVersion: '2.2.2',
        } as devfileApi.Devfile,
        {
          metadata: {
            name: 'che-code',
            attributes: {
              publisher: 'che-incubator',
              version: 'insiders',
            },
          },
          schemaVersion: '2.2.2',
        } as devfileApi.Devfile,
      ];

      mockFetchEditors.mockResolvedValueOnce(editors);

      const store = new FakeStoreBuilder()
        .withDwServerConfig({
          defaults: {
            editor: 'che-incubator/default-editor/latest',
          },
        } as api.IServerConfig)
        .build() as MockStoreEnhanced<
        AppState,
        ThunkDispatch<AppState, undefined, dwPluginsStore.KnownAction>
      >;

      await store.dispatch(dwPluginsStore.actionCreators.requestEditors());

      const actions = store.getActions();

      const expectedEditors = [
        {
          metadata: {
            name: 'che-code',
            attributes: {
              publisher: 'che-incubator',
              version: 'insiders',
            },
          },
          schemaVersion: '2.2.2',
        } as devfileApi.Devfile,
      ];

      const expectedActions: dwPluginsStore.KnownAction[] = [
        {
          type: 'REQUEST_EDITORS',
        },
        {
          type: 'RECEIVE_EDITORS',
          editors: expectedEditors,
        },
      ];

      expect(actions).toEqual(expectedActions);
    });

    it('should filter editors from ConfigMap and exclude one without metadata.attributes.version', async () => {
      const editors = [
        {
          metadata: {
            name: 'che-idea',
            attributes: {
              publisher: 'che-incubator',
            },
          },
          schemaVersion: '2.2.2',
        } as devfileApi.Devfile,
        {
          metadata: {
            name: 'che-code',
            attributes: {
              publisher: 'che-incubator',
              version: 'insiders',
            },
          },
          schemaVersion: '2.2.2',
        } as devfileApi.Devfile,
      ];

      mockFetchEditors.mockResolvedValueOnce(editors);

      const store = new FakeStoreBuilder()
        .withDwServerConfig({
          defaults: {
            editor: 'che-incubator/default-editor/latest',
          },
        } as api.IServerConfig)
        .build() as MockStoreEnhanced<
        AppState,
        ThunkDispatch<AppState, undefined, dwPluginsStore.KnownAction>
      >;

      await store.dispatch(dwPluginsStore.actionCreators.requestEditors());

      const actions = store.getActions();

      const expectedEditors = [
        {
          metadata: {
            name: 'che-code',
            attributes: {
              publisher: 'che-incubator',
              version: 'insiders',
            },
          },
          schemaVersion: '2.2.2',
        } as devfileApi.Devfile,
      ];

      const expectedActions: dwPluginsStore.KnownAction[] = [
        {
          type: 'REQUEST_EDITORS',
        },
        {
          type: 'RECEIVE_EDITORS',
          editors: expectedEditors,
        },
      ];

      expect(actions).toEqual(expectedActions);
    });

    it('should create REQUEST_EDITORS and RECEIVE_EDITORS_ERROR when failed to fetch editors', async () => {
      mockFetchEditors.mockRejectedValueOnce({
        isAxiosError: true,
        code: '500',
        message: 'Something unexpected happened.',
      } as AxiosError);

      const store = new FakeStoreBuilder().build() as MockStoreEnhanced<
        AppState,
        ThunkDispatch<AppState, undefined, dwPluginsStore.KnownAction>
      >;

      try {
        await store.dispatch(dwPluginsStore.actionCreators.requestEditors());
      } catch (e) {
        // noop
      }

      const actions = store.getActions();

      const expectedActions: dwPluginsStore.KnownAction[] = [
        {
          type: 'REQUEST_EDITORS',
        },
        {
          type: 'RECEIVE_EDITORS_ERROR',
          error: expect.stringContaining('Something unexpected happened.'),
        },
      ];

      expect(actions).toEqual(expectedActions);
    });

    it('should create REQUEST_DW_PLUGIN and RECEIVE_DW_PLUGIN when fetching a plugin', async () => {
      mockFetchDevfile.mockResolvedValueOnce(JSON.stringify(plugin));

      const store = new FakeStoreBuilder().build() as MockStoreEnhanced<
        AppState,
        ThunkDispatch<AppState, undefined, dwPluginsStore.KnownAction>
      >;

      const url = 'devworkspace-devfile-location';
      await store.dispatch(dwPluginsStore.actionCreators.requestDwDevfile(url));

      const actions = store.getActions();

      const expectedActions: dwPluginsStore.KnownAction[] = [
        {
          type: 'REQUEST_DW_PLUGIN',
          url,
          check: AUTHORIZED,
        },
        {
          type: 'RECEIVE_DW_PLUGIN',
          plugin,
          url,
        },
      ];

      expect(actions).toEqual(expectedActions);
    });

    it('should create REQUEST_DW_PLUGIN and RECEIVE_DW_PLUGIN_ERROR when failed to fetch a plugin', async () => {
      mockFetchDevfile.mockRejectedValueOnce({
        isAxiosError: true,
        code: '500',
        message: 'Something unexpected happened.',
      } as AxiosError);

      const store = new FakeStoreBuilder().build() as MockStoreEnhanced<
        AppState,
        ThunkDispatch<AppState, undefined, dwPluginsStore.KnownAction>
      >;

      const url = 'devworkspace-devfile-location';
      try {
        await store.dispatch(dwPluginsStore.actionCreators.requestDwDevfile(url));
      } catch (e) {
        // noop
      }
      const actions = store.getActions();

      const expectedActions: dwPluginsStore.KnownAction[] = [
        {
          type: 'REQUEST_DW_PLUGIN',
          url,
          check: AUTHORIZED,
        },
        {
          type: 'RECEIVE_DW_PLUGIN_ERROR',
          error: expect.stringContaining('Something unexpected happened.'),
          url,
        },
      ];

      expect(actions).toEqual(expectedActions);
    });

    it('should create REQUEST_DW_EDITOR and RECEIVE_DW_EDITOR when fetching the default editor', async () => {
      mockFetchData.mockResolvedValueOnce(JSON.stringify(plugin));

      const cmEditors = [
        {
          metadata: {
            name: 'default-editor',
            attributes: {
              publisher: 'che-incubator',
              version: 'latest',
            },
          },
          schemaVersion: '2.2.2',
        } as devfileApi.Devfile,
      ];

      const store = new FakeStoreBuilder()
        .withDwServerConfig({
          defaults: {
            editor: 'che-incubator/default-editor/latest',
          },
          pluginRegistryURL: 'plugin-registry-location',
        } as api.IServerConfig)
        .withDwPlugins({}, {}, false, cmEditors)
        .build() as MockStoreEnhanced<
        AppState,
        ThunkDispatch<AppState, undefined, dwPluginsStore.KnownAction>
      >;

      await store.dispatch(dwPluginsStore.actionCreators.requestDwDefaultEditor());
      const actions = store.getActions();

      const expectedActions: dwPluginsStore.KnownAction[] = [
        {
          type: 'REQUEST_DW_DEFAULT_EDITOR',
          check: AUTHORIZED,
        },
        {
          type: 'RECEIVE_DW_EDITOR',
          editorName: 'che-incubator/default-editor/latest',
          url: '',
          plugin: {
            metadata: expect.objectContaining({ name: 'default-editor' }),
            schemaVersion: '2.2.2',
          },
        },
        {
          type: 'RECEIVE_DW_DEFAULT_EDITOR',
          defaultEditorName: 'che-incubator/default-editor/latest',
          url: '',
        },
      ];
      expect(actions).toEqual(expectedActions);
    });

    it('should create REQUEST_DW_EDITOR and RECEIVE_DW_EDITOR when fetching http editor', async () => {
      mockFetchData.mockResolvedValueOnce(JSON.stringify(plugin));

      const store = new FakeStoreBuilder()
        .withDwServerConfig({
          defaults: {
            editor: 'default-editor',
          },
        } as api.IServerConfig)
        .build() as MockStoreEnhanced<
        AppState,
        ThunkDispatch<AppState, undefined, dwPluginsStore.KnownAction>
      >;

      // no plugin url as it should fetch from the editor directly
      const editorLink = 'https://my-fake-editor.yaml';
      await store.dispatch(dwPluginsStore.actionCreators.requestDwEditor(editorLink));
      const actions = store.getActions();

      const expectedActions: dwPluginsStore.KnownAction[] = [
        {
          type: 'REQUEST_DW_EDITOR',
          url: 'https://my-fake-editor.yaml',
          editorName: editorLink,
          check: AUTHORIZED,
        },
        {
          type: 'RECEIVE_DW_EDITOR',
          url: 'https://my-fake-editor.yaml',
          editorName: editorLink,
          plugin,
        },
      ];
      expect(actions).toEqual(expectedActions);

      expect(mockFetchData).toHaveBeenCalledWith(editorLink);
    });

    it('should create REQUEST_DW_EDITOR and RECEIVE_DW_EDITOR_ERROR when failed to fetch an editor', async () => {
      mockFetchData.mockRejectedValueOnce({
        isAxiosError: true,
        code: '500',
        message: 'Something unexpected happened.',
      } as AxiosError);

      // no plugin url as it should fetch from the editor directly
      const editorLink = 'https://my-fake-editor.yaml';

      const store = new FakeStoreBuilder()
        .withDwServerConfig({
          defaults: {
            editor: 'default-editor',
          },
        } as api.IServerConfig)
        .build() as MockStoreEnhanced<
        AppState,
        ThunkDispatch<AppState, undefined, dwPluginsStore.KnownAction>
      >;

      await store.dispatch(dwPluginsStore.actionCreators.requestDwEditor(editorLink)).catch(() => {
        // noop
      });

      const actions = store.getActions();

      const expectedActions: dwPluginsStore.KnownAction[] = [
        {
          type: 'REQUEST_DW_EDITOR',
          url: 'https://my-fake-editor.yaml',
          editorName: editorLink,
          check: AUTHORIZED,
        },
        {
          type: 'RECEIVE_DW_EDITOR_ERROR',
          url: 'https://my-fake-editor.yaml',
          error: expect.stringContaining(
            'Failed to load the editor https://my-fake-editor.yaml. Invalid devfile.',
          ),
          editorName: editorLink,
        },
      ];

      expect(actions).toEqual(expectedActions);
    });

    it('should create only RECEIVE_DW_DEFAULT_EDITOR_ERROR if workspace settings do not have necessary fields', async () => {
      (mockAxios.get as jest.Mock).mockResolvedValueOnce({
        data: {},
      });

      const store = new FakeStoreBuilder().build() as MockStoreEnhanced<
        AppState,
        ThunkDispatch<AppState, undefined, dwPluginsStore.KnownAction>
      >;

      try {
        await store.dispatch(dwPluginsStore.actionCreators.requestDwDefaultEditor());
      } catch (e) {
        // noop
      }
      const actions = store.getActions();

      const expectedActions: dwPluginsStore.KnownAction[] = [
        {
          type: 'REQUEST_DW_DEFAULT_EDITOR',
          check: AUTHORIZED,
        },
        {
          type: 'RECEIVE_DW_DEFAULT_EDITOR_ERROR',
          error:
            'Failed to load the default editor, reason: default editor ID is not provided by Che server.',
        },
      ];

      expect(actions).toEqual(expectedActions);
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it('should create REQUEST_DW_EDITOR and RECEIVE_DW_EDITOR_ERROR when it does not exist in the config map', async () => {
      (mockAxios.get as jest.Mock).mockRejectedValueOnce({
        isAxiosError: true,
        code: '500',
        message: 'unexpected error',
      } as AxiosError);

      const store = new FakeStoreBuilder()
        .withDwServerConfig({
          defaults: {
            editor: 'default-editor',
          },
        } as api.IServerConfig)
        .build() as MockStoreEnhanced<
        AppState,
        ThunkDispatch<AppState, undefined, dwPluginsStore.KnownAction>
      >;

      try {
        await store.dispatch(dwPluginsStore.actionCreators.requestDwDefaultEditor());
      } catch (e) {
        // noop
      }
      const actions = store.getActions();

      const expectedActions: dwPluginsStore.KnownAction[] = [
        {
          type: 'REQUEST_DW_DEFAULT_EDITOR',
          check: AUTHORIZED,
        },
        {
          type: 'RECEIVE_DW_EDITOR_ERROR',
          url: '',
          editorName: 'default-editor',
          error: expect.stringContaining(
            'The editor does not exist in the editors configuration map',
          ),
        },
      ];
      expect(actions).toEqual(expectedActions);
    });

    it('should create REQUEST_DW_DEFAULT_EDITOR and RECEIVE_DW_DEFAULT_EDITOR when fetching default plugins', async () => {
      const store = new FakeStoreBuilder()
        .withDwServerConfig({
          containerBuild: {},
          defaults: {
            editor: 'eclipse/theia/next',
            components: [
              {
                name: 'universal-developer-image',
                container: {
                  image: 'quay.io/devfile/universal-developer-image:ubi8-latest',
                },
              },
            ],
            plugins: [
              {
                editor: 'eclipse/theia/next',
                plugins: ['https://test.com/devfile.yaml'],
              },
            ],
            pvcStrategy: 'per-workspace',
          },
          pluginRegistry: {
            openVSXURL: '',
          },
          timeouts: {
            inactivityTimeout: -1,
            runTimeout: -1,
            startTimeout: 300,
          },
          cheNamespace: 'eclipse-che',
          devfileRegistry: {
            disableInternalRegistry: false,
            externalDevfileRegistries: [],
          },
          devfileRegistryURL: '',
          devfileRegistryInternalURL: '',
          pluginRegistryURL: '',
          pluginRegistryInternalURL: '',
        })
        .build() as MockStoreEnhanced<
        AppState,
        ThunkDispatch<AppState, undefined, dwPluginsStore.KnownAction>
      >;

      await store.dispatch(dwPluginsStore.actionCreators.requestDwDefaultPlugins());

      const actions = store.getActions();

      const expectedActions: dwPluginsStore.KnownAction[] = [
        {
          type: 'REQUEST_DW_DEFAULT_PLUGINS',
          check: AUTHORIZED,
        },
        {
          type: 'RECEIVE_DW_DEFAULT_PLUGINS',
          defaultPlugins: {
            'eclipse/theia/next': ['https://test.com/devfile.yaml'],
          },
        },
      ];
      expect(actions).toEqual(expectedActions);
    });
  });

  describe('reducers', () => {
    it('should return initial state', () => {
      const incomingAction: dwPluginsStore.RequestDwPluginAction = {
        type: 'REQUEST_DW_PLUGIN',
        url: 'devfile-location',
        check: AUTHORIZED,
      };
      const initialState = dwPluginsStore.reducer(undefined, incomingAction);

      const expectedState: dwPluginsStore.State = {
        isLoading: false,
        plugins: {},
        editors: {},
        cmEditors: [],
        defaultEditorName: undefined,
        defaultPlugins: {},
      };

      expect(initialState).toEqual(expectedState);
    });

    it('should return state if action type is not matched', () => {
      const initialState: dwPluginsStore.State = {
        isLoading: true,
        editors: {},
        plugins: {},
        defaultPlugins: {},
      } as dwPluginsStore.State;
      const incomingAction = {
        type: 'OTHER_ACTION',
      } as AnyAction;
      const newState = dwPluginsStore.reducer(initialState, incomingAction);

      const expectedState: dwPluginsStore.State = {
        isLoading: true,
        plugins: {},
        editors: {},
        defaultPlugins: {},
      };
      expect(newState).toEqual(expectedState);
    });

    it('should handle REQUEST_DW_PLUGIN', () => {
      const initialState: dwPluginsStore.State = {
        isLoading: false,
        editors: {},
        plugins: {
          'devfile-location': {
            error: 'unexpected error',
            url: 'devfile-location',
          },
        },
        defaultPlugins: {},
      };
      const incomingAction: dwPluginsStore.RequestDwPluginAction = {
        type: 'REQUEST_DW_PLUGIN',
        url: 'devfile-location',
        check: AUTHORIZED,
      };

      const newState = dwPluginsStore.reducer(initialState, incomingAction);

      const expectedState: dwPluginsStore.State = {
        isLoading: true,
        editors: {},
        plugins: {
          'devfile-location': {
            url: 'devfile-location',
          },
        },
        defaultPlugins: {},
      };

      expect(newState).toEqual(expectedState);
    });

    it('should handle REQUEST_DW_EDITOR', () => {
      const initialState: dwPluginsStore.State = {
        isLoading: false,
        editors: {
          foo: {
            url: 'editor-location',
            error: 'unexpected error',
          },
        },
        plugins: {},
        defaultPlugins: {},
      };
      const incomingAction: dwPluginsStore.RequestDwEditorAction = {
        type: 'REQUEST_DW_EDITOR',
        editorName: 'foo',
        url: 'editor-location',
        check: AUTHORIZED,
      };

      const newState = dwPluginsStore.reducer(initialState, incomingAction);

      const expectedState: dwPluginsStore.State = {
        isLoading: true,
        editors: {
          foo: {
            plugin: undefined,
            url: 'editor-location',
          },
        },
        plugins: {},
        defaultPlugins: {},
      };

      expect(newState).toEqual(expectedState);
    });

    it('should handle REQUEST_DW_DEFAULT_EDITOR', () => {
      const initialState: dwPluginsStore.State = {
        isLoading: false,
        editors: {},
        plugins: {},
        defaultPlugins: {},
        defaultEditorError: 'unexpected error',
      };
      const incomingAction: dwPluginsStore.RequestDwDefaultEditorAction = {
        type: 'REQUEST_DW_DEFAULT_EDITOR',
        check: AUTHORIZED,
      };

      const newState = dwPluginsStore.reducer(initialState, incomingAction);

      const expectedState: dwPluginsStore.State = {
        isLoading: true,
        editors: {},
        plugins: {},
        defaultPlugins: {},
      };

      expect(newState).toEqual(expectedState);
    });

    it('should handle RECEIVE_DW_PLUGIN', () => {
      const initialState: dwPluginsStore.State = {
        isLoading: true,
        editors: {},
        plugins: {},
        defaultPlugins: {},
      };
      const incomingAction: dwPluginsStore.ReceiveDwPluginAction = {
        type: 'RECEIVE_DW_PLUGIN',
        url: 'devfile-location',
        plugin,
      };

      const newState = dwPluginsStore.reducer(initialState, incomingAction);

      const expectedState: dwPluginsStore.State = {
        isLoading: false,
        editors: {},
        plugins: {
          'devfile-location': {
            url: 'devfile-location',
            plugin,
          },
        },
        defaultPlugins: {},
      };

      expect(newState).toEqual(expectedState);
    });

    it('should handle RECEIVE_DW_EDITOR', () => {
      const initialState: dwPluginsStore.State = {
        isLoading: true,
        editors: {},
        plugins: {},
        defaultPlugins: {},
      };
      const incomingAction: dwPluginsStore.ReceiveDwEditorAction = {
        type: 'RECEIVE_DW_EDITOR',
        url: 'devfile-location',
        editorName: 'my-editor',
        plugin,
      };

      const newState = dwPluginsStore.reducer(initialState, incomingAction);

      const expectedState: dwPluginsStore.State = {
        isLoading: false,
        editors: {
          'my-editor': {
            url: 'devfile-location',
            plugin,
          },
        },
        plugins: {},
        defaultPlugins: {},
      };

      expect(newState).toEqual(expectedState);
    });

    it('should handle RECEIVE_DW_PLUGIN_ERROR', () => {
      const initialState: dwPluginsStore.State = {
        isLoading: true,
        editors: {},
        plugins: {},
        defaultPlugins: {},
      };
      const incomingAction: dwPluginsStore.ReceiveDwPluginErrorAction = {
        type: 'RECEIVE_DW_PLUGIN_ERROR',
        url: 'devfile-location',
        error: 'unexpected error',
      };

      const newState = dwPluginsStore.reducer(initialState, incomingAction);

      const expectedState: dwPluginsStore.State = {
        isLoading: false,
        editors: {},
        plugins: {
          'devfile-location': {
            url: 'devfile-location',
            error: 'unexpected error',
          },
        },
        defaultPlugins: {},
      };

      expect(newState).toEqual(expectedState);
    });

    it('should handle RECEIVE_DW_EDITOR_ERROR', () => {
      const initialState: dwPluginsStore.State = {
        isLoading: true,
        editors: {},
        plugins: {},
        defaultPlugins: {},
      };
      const incomingAction: dwPluginsStore.RequestDwEditorErrorAction = {
        type: 'RECEIVE_DW_EDITOR_ERROR',
        url: 'editor-location',
        editorName: 'foo',
        error: 'unexpected error',
      };

      const newState = dwPluginsStore.reducer(initialState, incomingAction);

      const expectedState: dwPluginsStore.State = {
        isLoading: false,
        editors: {
          foo: {
            error: 'unexpected error',
            url: 'editor-location',
          },
        },
        plugins: {},
        defaultPlugins: {},
      };

      expect(newState).toEqual(expectedState);
    });

    it('should handle RECEIVE_DW_DEFAULT_EDITOR_ERROR', () => {
      const initialState: dwPluginsStore.State = {
        isLoading: true,
        editors: {},
        plugins: {},
        defaultPlugins: {},
      };
      const incomingAction: dwPluginsStore.ReceiveDwDefaultEditorErrorAction = {
        type: 'RECEIVE_DW_DEFAULT_EDITOR_ERROR',
        error: 'unexpected error',
      };

      const newState = dwPluginsStore.reducer(initialState, incomingAction);

      const expectedState: dwPluginsStore.State = {
        isLoading: false,
        editors: {},
        plugins: {},
        defaultPlugins: {},
        defaultEditorError: 'unexpected error',
      };

      expect(newState).toEqual(expectedState);
    });

    it('should handle RECEIVE_DW_DEFAULT_EDITOR', () => {
      const initialState: dwPluginsStore.State = {
        isLoading: true,
        editors: {},
        plugins: {},
        defaultPlugins: {},
      };
      const incomingAction: dwPluginsStore.ReceiveDwDefaultEditorAction = {
        type: 'RECEIVE_DW_DEFAULT_EDITOR',
        url: 'default-editor-location',
        defaultEditorName: 'hello',
      };

      const newState = dwPluginsStore.reducer(initialState, incomingAction);

      const expectedState: dwPluginsStore.State = {
        isLoading: false,
        editors: {},
        plugins: {},
        defaultPlugins: {},
        defaultEditorName: 'hello',
      };

      expect(newState).toEqual(expectedState);
    });

    it('should handle REQUEST_DW_DEFAULT_PLUGINS', () => {
      const initialState: dwPluginsStore.State = {
        isLoading: false,
        editors: {},
        plugins: {},
        defaultPlugins: {},
      };
      const incomingAction: dwPluginsStore.RequestDwDefaultPluginsAction = {
        type: 'REQUEST_DW_DEFAULT_PLUGINS',
        check: AUTHORIZED,
      };

      const newState = dwPluginsStore.reducer(initialState, incomingAction);

      const expectedState: dwPluginsStore.State = {
        isLoading: true,
        editors: {},
        plugins: {},
        defaultPlugins: {},
      };

      expect(newState).toEqual(expectedState);
    });

    it('should handle RECEIVE_DW_DEFAULT_PLUGINS', () => {
      const initialState: dwPluginsStore.State = {
        isLoading: true,
        editors: {},
        plugins: {},
        defaultPlugins: {},
      };

      const defaultPlugins = { 'eclipse/theia/next': ['https://test.com/devfile.yaml'] };

      const incomingAction: dwPluginsStore.ReceiveDwDefaultPluginsAction = {
        type: 'RECEIVE_DW_DEFAULT_PLUGINS',
        defaultPlugins,
      };

      const newState = dwPluginsStore.reducer(initialState, incomingAction);

      const expectedState: dwPluginsStore.State = {
        isLoading: false,
        editors: {},
        plugins: {},
        defaultPlugins,
      };
      expect(newState).toEqual(expectedState);
    });
  });
});
