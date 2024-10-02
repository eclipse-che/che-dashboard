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

import { createReducer } from '@reduxjs/toolkit';

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
  PluginDefinition,
  WorkspacesDefaultPlugins,
} from '@/store/Plugins/devWorkspacePlugins/actions';

export interface State {
  isLoading: boolean;
  plugins: {
    [url: string]: PluginDefinition;
  };
  editors: {
    [editorName: string]: PluginDefinition;
  };
  defaultPlugins: WorkspacesDefaultPlugins;
  defaultEditorName?: string;
  defaultEditorError?: string;
  cmEditors?: devfileApi.Devfile[];
}

export const unloadedState: State = {
  isLoading: false,
  plugins: {},
  editors: {},
  defaultPlugins: {},
  defaultEditorName: undefined,
  cmEditors: [],
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(dwEditorsRequestAction, state => {
      state.isLoading = true;
    })
    .addCase(dwEditorsReceiveAction, (state, action) => {
      state.isLoading = false;
      state.cmEditors = action.payload;
    })
    .addCase(dwEditorsErrorAction, state => {
      state.isLoading = false;
      state.cmEditors = [];
    })
    .addCase(dwPluginRequestAction, (state, action) => {
      state.isLoading = true;
      // only remove the error
      delete state.plugins?.[action.payload]?.error;
    })
    .addCase(dwPluginReceiveAction, (state, action) => {
      state.isLoading = false;
      state.plugins[action.payload.url] = {
        plugin: action.payload.plugin,
        url: action.payload.url,
      };
    })
    .addCase(dwPluginErrorAction, (state, action) => {
      state.isLoading = false;
      // save the error and keep the plugin
      state.plugins[action.payload.url] = {
        error: action.payload.error,
        url: action.payload.url,
        plugin: state.plugins[action.payload.url]?.plugin,
      };
    })
    .addCase(dwEditorRequestAction, (state, action) => {
      state.isLoading = true;
      // remove both the plugin and the error
      state.editors[action.payload.editorName] = {
        url: action.payload.url,
      };
    })
    .addCase(dwEditorReceiveAction, (state, action) => {
      state.isLoading = false;
      state.editors[action.payload.editorName] = {
        plugin: action.payload.plugin,
        url: action.payload.url,
      };
    })
    .addCase(dwEditorErrorAction, (state, action) => {
      state.isLoading = false;
      state.editors[action.payload.editorName] = {
        error: action.payload.error,
        url: action.payload.url,
      };
    })
    .addCase(dwDefaultEditorRequestAction, state => {
      state.isLoading = true;
      state.defaultEditorName = undefined;
      state.defaultEditorError = undefined;
    })
    .addCase(dwDefaultEditorReceiveAction, (state, action) => {
      state.isLoading = false;
      state.defaultEditorName = action.payload.defaultEditorName;
    })
    .addCase(dwDefaultEditorErrorAction, (state, action) => {
      state.isLoading = false;
      state.defaultEditorError = action.payload;
    })
    .addCase(dwDefaultPluginsRequestAction, state => {
      state.isLoading = true;
    })
    .addCase(dwDefaultPluginsReceiveAction, (state, action) => {
      state.isLoading = false;
      state.defaultPlugins = action.payload;
    })
    .addDefaultCase(state => state),
);
