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

import devfileApi from '@/services/devfileApi';
import { RootState } from '@/store';
import {
  selectDefaultEditor,
  selectDwDefaultEditorError,
  selectDwEditorsPluginsList,
  selectDwPlugins,
  selectDwPluginsList,
} from '@/store/Plugins/devWorkspacePlugins/selectors';

describe('Plugins Selectors', () => {
  const mockState = {
    dwPlugins: {
      plugins: {
        'https://example.com/plugin1.yaml': {
          plugin: { metadata: { name: 'plugin1' } } as devfileApi.Devfile,
          url: 'https://example.com/plugin1.yaml',
        },
        'https://example.com/plugin2.yaml': {
          plugin: { metadata: { name: 'plugin2' } } as devfileApi.Devfile,
          url: 'https://example.com/plugin2.yaml',
        },
      },
      editors: {
        editor1: {
          plugin: { metadata: { name: 'editor1' } } as devfileApi.Devfile,
          url: 'https://example.com/editor1.yaml',
        },
        editor2: {
          plugin: { metadata: { name: 'editor2' } } as devfileApi.Devfile,
          url: 'https://example.com/editor2.yaml',
        },
      },
      defaultEditorName: 'editor1',
      defaultEditorError: 'Error message',
      defaultPlugins: {},
      isLoading: false,
    },
  } as Partial<RootState> as RootState;

  it('should select dwPlugins', () => {
    const result = selectDwPlugins(mockState);
    expect(result).toEqual(mockState.dwPlugins.plugins);
  });

  it('should select dwPluginsList', () => {
    const result = selectDwPluginsList(mockState);
    expect(result).toEqual([{ metadata: { name: 'plugin1' } }, { metadata: { name: 'plugin2' } }]);
  });

  it('should select dwEditorsPluginsList for a specific editor', () => {
    const selectEditorPlugins = selectDwEditorsPluginsList('editor1');
    const result = selectEditorPlugins(mockState);
    expect(result).toEqual([
      { devfile: { metadata: { name: 'editor1' } }, url: 'https://example.com/editor1.yaml' },
    ]);
  });

  it('should select dwEditorsPluginsList for an editor that does not exist', () => {
    const selectEditorPlugins = selectDwEditorsPluginsList('nonexistent-editor');
    const result = selectEditorPlugins(mockState);
    expect(result).toEqual([]);
  });

  it('should select the default editor', () => {
    const result = selectDefaultEditor(mockState);
    expect(result).toEqual('editor1');
  });

  it('should select the default editor error', () => {
    const result = selectDwDefaultEditorError(mockState);
    expect(result).toEqual('Error message');
  });
});
