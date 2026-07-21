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
  deviceAuthTokenErrorAction,
  deviceAuthTokenReceiveAction,
  deviceAuthTokenRemoveAction,
  deviceAuthTokenRequestAction,
} from '@/store/DeviceAuthToken/actions';

export type DeviceAuthTokenState = {
  tokens: api.DeviceAuthToken[];
  isLoading: boolean;
  error: string | undefined;
};

export const unloadedState: DeviceAuthTokenState = {
  tokens: [],
  isLoading: false,
  error: undefined,
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(deviceAuthTokenRequestAction, state => {
      state.isLoading = true;
      state.error = undefined;
    })
    .addCase(deviceAuthTokenReceiveAction, (state, action) => {
      state.isLoading = false;
      state.tokens = action.payload;
    })
    .addCase(deviceAuthTokenRemoveAction, (state, action) => {
      state.isLoading = false;
      state.tokens = state.tokens.filter(t => t.name !== action.payload);
    })
    .addCase(deviceAuthTokenErrorAction, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    })
    .addDefaultCase(state => state),
);
