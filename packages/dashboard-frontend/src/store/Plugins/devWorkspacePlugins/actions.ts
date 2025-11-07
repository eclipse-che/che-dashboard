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
import { createAction } from '@reduxjs/toolkit';
import { load } from 'js-yaml';

import { fetchEditors } from '@/services/backend-client/editorsApi';
import devfileApi from '@/services/devfileApi';
import { fetchDevfile } from '@/services/registry/devfiles';
import { fetchData } from '@/services/registry/fetchData';
import { AppThunk } from '@/store';
import { verifyAuthorized } from '@/store/SanityCheck';

export interface PluginDefinition {
  plugin?: devfileApi.Devfile;
  url: string;
  error?: string;
}

export interface WorkspacesDefaultPlugins {
  [editorName: string]: string[];
}

/** Editors */

export const dwEditorsRequestAction = createAction('dwEditors/request');
export const dwEditorsReceiveAction = createAction<devfileApi.Devfile[]>('dwEditors/receive');
export const dwEditorsErrorAction = createAction<string>('dwEditors/error');

/** Default Editor */

export const dwDefaultEditorRequestAction = createAction('dwDefaultEditor/request');

type DwDefaultEditorReceivePayload = {
  url: string;
  defaultEditorName: string;
};
export const dwDefaultEditorReceiveAction =
  createAction<DwDefaultEditorReceivePayload>('dwDefaultEditor/receive');

export const dwDefaultEditorErrorAction = createAction<string>('dwDefaultEditor/error');

/** Plugin */

export const dwPluginRequestAction = createAction<string>('dwPlugin/request');

type DwPluginReceivePayload = {
  url: string;
  plugin: devfileApi.Devfile;
};
export const dwPluginReceiveAction = createAction<DwPluginReceivePayload>('dwPlugin/receive');

type DwPluginErrorPayload = {
  url: string;
  error: string;
};
export const dwPluginErrorAction = createAction<DwPluginErrorPayload>('dwPlugin/error');

/** Editor */

export interface DwEditorReceivePayload {
  url: string;
  editorName: string;
  plugin: devfileApi.Devfile;
}
export const dwEditorReceiveAction = createAction<DwEditorReceivePayload>('dwEditor/receive');

type DwEditorRequestPayload = {
  url: string;
  editorName: string;
};
export const dwEditorRequestAction = createAction<DwEditorRequestPayload>('dwEditor/request');

type DwEditorErrorPayload = {
  editorName: string;
  url: string;
  error: string;
};
export const dwEditorErrorAction = createAction<DwEditorErrorPayload>('dwEditor/error');

/** Default Plugins */

export const dwDefaultPluginsRequestAction = createAction('dwDefaultPlugins/request');

export const dwDefaultPluginsReceiveAction = createAction<WorkspacesDefaultPlugins>(
  'dwDefaultPlugins/receive',
);

export const actionCreators = {
  requestDwDevfile:
    (url: string): AppThunk =>
    async (dispatch, getState) => {
      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(dwPluginRequestAction(url));

        const pluginContent = await fetchDevfile(url);
        const plugin = load(pluginContent) as devfileApi.Devfile;
        dispatch(dwPluginReceiveAction({ url, plugin }));
      } catch (e) {
        const errorMessage = common.helpers.errors.getMessage(e);
        dispatch(dwPluginErrorAction({ url, error: errorMessage }));
        throw e;
      }
    },

  requestEditors: (): AppThunk => async (dispatch, getState) => {
    try {
      await verifyAuthorized(dispatch, getState);

      dispatch(dwEditorsRequestAction());

      const editors = (await fetchEditors()) as devfileApi.Devfile[];
      const filteredEditors: devfileApi.Devfile[] = [];
      editors.forEach(editor => {
        if (
          !editor.metadata.attributes.publisher ||
          !editor.metadata.attributes.version ||
          !editor.metadata.name
        ) {
          console.warn(
            `Missing metadata attributes in the editor yaml file: ${editor.metadata.name}. metadata.name, metadata.attributes.publisher and metadata.attributes.version should be set. Skipping this editor.`,
          );
        } else {
          filteredEditors.push(editor);
        }
      });

      dispatch(dwEditorsReceiveAction(filteredEditors));
    } catch (e) {
      const errorMessage = common.helpers.errors.getMessage(e);
      dispatch(dwEditorsErrorAction(errorMessage));
      throw e;
    }
  },

  requestDwEditor:
    (editorName: string): AppThunk =>
    async (dispatch, getState) => {
      let editorUrl: string;

      // check if the editor is an id or URL to a given editor
      if (editorName.startsWith('https://')) {
        editorUrl = editorName;
        try {
          await verifyAuthorized(dispatch, getState);

          dispatch(dwEditorRequestAction({ editorName, url: editorUrl }));

          const pluginContent = await fetchData<string>(editorUrl);
          const plugin = load(pluginContent) as devfileApi.Devfile;

          dispatch(dwEditorReceiveAction({ editorName, url: editorUrl, plugin }));
        } catch (error) {
          const errorMessage = `Failed to load the editor ${editorName}. Invalid devfile. Check 'che-editor' param.`;
          dispatch(dwEditorErrorAction({ editorName, url: editorUrl, error: errorMessage }));
          throw error;
        }
      } else {
        const editors = getState().dwPlugins.cmEditors || [];
        const editor = editors.find(
          editor =>
            editor.metadata.attributes.publisher +
              '/' +
              editor.metadata.name +
              '/' +
              editor.metadata.attributes.version ===
            editorName,
        );
        if (editor) {
          dispatch(dwEditorReceiveAction({ editorName, url: '', plugin: editor }));
        } else {
          const errorMessage = `Failed to load editor ${editorName}. The editor does not exist in the editors configuration map.`;
          dispatch(dwEditorErrorAction({ editorName, url: '', error: errorMessage }));
          throw new Error(errorMessage);
        }
      }
    },

  requestDwDefaultEditor: (): AppThunk => async (dispatch, getState) => {
    dispatch(dwDefaultEditorRequestAction());

    const config = getState().dwServerConfig.config;
    const defaultEditor = config.defaults?.editor;

    if (!defaultEditor) {
      const errorMessage =
        'Failed to load the default editor, reason: default editor ID is not provided by Che server.';
      dispatch(dwDefaultEditorErrorAction(errorMessage));
      throw new Error(errorMessage);
    }

    const defaultEditorUrl = (defaultEditor as string).startsWith('https://') ? defaultEditor : '';

    // request default editor
    await dispatch(actionCreators.requestDwEditor(defaultEditor));

    dispatch(
      dwDefaultEditorReceiveAction({
        url: defaultEditorUrl,
        defaultEditorName: defaultEditor,
      }),
    );
  },

  requestDwDefaultPlugins: (): AppThunk => async (dispatch, getState) => {
    dispatch(dwDefaultPluginsRequestAction());

    const defaultPlugins = {};
    const defaults = getState().dwServerConfig.config.defaults;
    (defaults.plugins || []).forEach(item => {
      if (!defaultPlugins[item.editor]) {
        defaultPlugins[item.editor] = [];
      }
      defaultPlugins[item.editor].push(...item.plugins);
    });

    dispatch(dwDefaultPluginsReceiveAction(defaultPlugins));
  },
};
