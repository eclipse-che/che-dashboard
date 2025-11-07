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

import { api } from '@eclipse-che/common';
import { createReducer } from '@reduxjs/toolkit';

import {
  keysAddAction,
  keysErrorAction,
  keysReceiveAction,
  keysRemoveAction,
  keysRequestAction,
} from '@/store/SshKeys/actions';

export interface State {
  isLoading: boolean;
  keys: api.SshKey[];
  error?: string;
}

export const unloadedState: State = {
  isLoading: false,
  keys: [],
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(keysRequestAction, state => {
      state.isLoading = true;
    })
    .addCase(keysReceiveAction, (state, action) => {
      state.isLoading = false;
      state.keys = action.payload;
    })
    .addCase(keysAddAction, (state, action) => {
      state.isLoading = false;
      state.keys.push(action.payload);
    })
    .addCase(keysRemoveAction, (state, action) => {
      state.isLoading = false;
      state.keys = state.keys.filter(key => key.name !== action.payload.name);
    })
    .addCase(keysErrorAction, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    })
    .addDefaultCase(state => state),
);
