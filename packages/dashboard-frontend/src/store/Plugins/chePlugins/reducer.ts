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

import { createReducer } from '@reduxjs/toolkit';

import { che } from '@/services/models';
import {
  pluginsErrorAction,
  pluginsReceiveAction,
  pluginsRequestAction,
} from '@/store/Plugins/chePlugins/actions';

export interface State {
  isLoading: boolean;
  plugins: che.Plugin[];
  error?: string;
}

export const unloadedState: State = {
  isLoading: false,
  plugins: [],
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(pluginsRequestAction, state => {
      state.isLoading = true;
    })
    .addCase(pluginsReceiveAction, (state, action) => {
      state.isLoading = false;
      state.plugins = action.payload;
    })
    .addCase(pluginsErrorAction, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    })
    .addDefaultCase(state => state),
);
