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

import { UnknownAction } from 'redux';

import devfileApi from '@/services/devfileApi';
import {
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
  WorkspacesDefaultPlugins,
} from '@/store/Plugins/devWorkspacePlugins/actions';
import { reducer, State, unloadedState } from '@/store/Plugins/devWorkspacePlugins/reducer';

describe('Plugins reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle dwEditorsRequestAction', () => {
    const action = dwEditorsRequestAction();
    const expectedState: State = {
      ...initialState,
      isLoading: true,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle dwEditorsReceiveAction', () => {
    const editors = [{ metadata: { name: 'editor1' } }] as devfileApi.Devfile[];
    const action = dwEditorsReceiveAction(editors);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      cmEditors: editors,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle dwEditorsErrorAction', () => {
    const action = dwEditorsErrorAction('Error message');
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      cmEditors: [],
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle dwPluginRequestAction', () => {
    const pluginUrl = 'https://example.com/plugin.yaml';
    const action = dwPluginRequestAction(pluginUrl);
    const state: State = {
      ...initialState,
      plugins: {
        [pluginUrl]: {
          error: 'Error message',
          url: pluginUrl,
        },
      },
    };
    const expectedState: State = {
      ...initialState,
      isLoading: true,
      plugins: {
        [pluginUrl]: {
          url: pluginUrl,
        },
      },
    };

    expect(reducer(state, action)).toEqual(expectedState);
  });

  it('should handle dwPluginReceiveAction', () => {
    const plugin = { metadata: { name: 'plugin1' } } as devfileApi.Devfile;
    const action = dwPluginReceiveAction({ url: 'https://example.com/plugin.yaml', plugin });
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      plugins: {
        'https://example.com/plugin.yaml': {
          plugin,
          url: 'https://example.com/plugin.yaml',
        },
      },
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle dwPluginErrorAction', () => {
    const action = dwPluginErrorAction({
      url: 'https://example.com/plugin.yaml',
      error: 'Error message',
    });
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      plugins: {
        'https://example.com/plugin.yaml': {
          error: 'Error message',
          url: 'https://example.com/plugin.yaml',
        },
      },
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle dwEditorRequestAction', () => {
    const action = dwEditorRequestAction({
      editorName: 'editor1',
      url: 'https://example.com/editor.yaml',
    });
    const expectedState: State = {
      ...initialState,
      isLoading: true,
      editors: {
        editor1: {
          url: 'https://example.com/editor.yaml',
        },
      },
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle dwEditorReceiveAction', () => {
    const editor = { metadata: { name: 'editor1' } } as devfileApi.Devfile;
    const action = dwEditorReceiveAction({
      editorName: 'editor1',
      url: 'https://example.com/editor.yaml',
      plugin: editor,
    });
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      editors: {
        editor1: {
          plugin: editor,
          url: 'https://example.com/editor.yaml',
        },
      },
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle dwEditorErrorAction', () => {
    const action = dwEditorErrorAction({
      editorName: 'editor1',
      url: 'https://example.com/editor.yaml',
      error: 'Error message',
    });
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      editors: {
        editor1: {
          error: 'Error message',
          url: 'https://example.com/editor.yaml',
        },
      },
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle dwDefaultEditorRequestAction', () => {
    const action = dwDefaultEditorRequestAction();
    const expectedState: State = {
      ...initialState,
      isLoading: true,
      defaultEditorName: undefined,
      defaultEditorError: undefined,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle dwDefaultEditorReceiveAction', () => {
    const action = dwDefaultEditorReceiveAction({
      defaultEditorName: 'editor1',
      url: 'https://example.com/editor.yaml',
    });
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      defaultEditorName: 'editor1',
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle dwDefaultEditorErrorAction', () => {
    const action = dwDefaultEditorErrorAction('Error message');
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      defaultEditorError: 'Error message',
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle dwDefaultPluginsRequestAction', () => {
    const action = dwDefaultPluginsRequestAction();
    const expectedState: State = {
      ...initialState,
      isLoading: true,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle dwDefaultPluginsReceiveAction', () => {
    const defaultPlugins = { editor1: ['plugin1', 'plugin2'] } as WorkspacesDefaultPlugins;
    const action = dwDefaultPluginsReceiveAction(defaultPlugins);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      defaultPlugins,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should return the current state for unknown actions', () => {
    const unknownAction = { type: 'UNKNOWN_ACTION' } as UnknownAction;
    expect(reducer(initialState, unknownAction)).toEqual(initialState);
  });
});
