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
import { che } from '@/services/models';
import {
  devfileReceiveAction,
  devfileRequestAction,
  filterClearAction,
  filterSetAction,
  languagesFilterClearAction,
  languagesFilterSetAction,
  registryMetadataErrorAction,
  registryMetadataReceiveAction,
  registryMetadataRequestAction,
  resourcesErrorAction,
  resourcesReceiveAction,
  resourcesRequestAction,
  tagsFilterClearAction,
  tagsFilterSetAction,
} from '@/store/DevfileRegistries/actions';

export type DevWorkspaceResources = [devfileApi.DevWorkspace, devfileApi.DevWorkspaceTemplate];

export interface State {
  isLoading: boolean;
  registries: {
    [location: string]: {
      metadata?: che.DevfileMetaData[];
      error?: string;
    };
  };
  devfiles: {
    [location: string]: {
      content?: string;
      error?: string;
    };
  };
  devWorkspaceResources: {
    [location: string]: {
      resources?: DevWorkspaceResources;
      error?: string;
    };
  };

  // current filter value
  filter: string;
  tagsFilter: string[];
  languagesFilter: string[];
}

export const unloadedState: State = {
  isLoading: false,
  registries: {},
  devfiles: {},
  devWorkspaceResources: {},

  filter: '',
  tagsFilter: [],
  languagesFilter: [],
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(registryMetadataRequestAction, state => {
      state.isLoading = true;
    })
    .addCase(registryMetadataReceiveAction, (state, action) => {
      state.isLoading = false;
      state.registries[action.payload.url] = {
        metadata: action.payload.metadata,
      };
    })
    .addCase(registryMetadataErrorAction, (state, action) => {
      state.isLoading = false;
      state.registries[action.payload.url] = {
        error: action.payload.error,
        metadata: state.registries[action.payload.url]?.metadata || [],
      };
    })
    .addCase(devfileRequestAction, state => {
      state.isLoading = true;
    })
    .addCase(devfileReceiveAction, (state, action) => {
      state.isLoading = false;
      state.devfiles[action.payload.url] = {
        content: action.payload.devfile,
      };
    })
    .addCase(resourcesRequestAction, state => {
      state.isLoading = true;
    })
    .addCase(resourcesReceiveAction, (state, action) => {
      state.isLoading = false;
      state.devWorkspaceResources[action.payload.url] = {
        resources: [action.payload.devWorkspace, action.payload.devWorkspaceTemplate],
      };
    })
    .addCase(resourcesErrorAction, (state, action) => {
      state.isLoading = false;
      state.devWorkspaceResources[action.payload.url] = {
        error: action.payload.error,
      };
    })
    .addCase(filterSetAction, (state, action) => {
      state.filter = action.payload;
    })
    .addCase(filterClearAction, state => {
      state.filter = '';
    })
    .addCase(tagsFilterSetAction, (state, action) => {
      state.tagsFilter = action.payload;
    })
    .addCase(tagsFilterClearAction, state => {
      state.tagsFilter = [];
    })
    .addCase(languagesFilterSetAction, (state, action) => {
      state.languagesFilter = action.payload;
    })
    .addCase(languagesFilterClearAction, state => {
      state.languagesFilter = [];
    })
    .addDefaultCase(state => state),
);
