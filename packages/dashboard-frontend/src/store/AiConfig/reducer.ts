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
  aiConfigErrorAction,
  aiConfigKeyStatusReceiveAction,
  aiConfigReceiveAction,
  aiConfigRequestAction,
} from '@/store/AiConfig/actions';

export type AiConfigState = {
  providers: api.AiProviderDefinition[];
  tools: api.AiToolDefinition[];
  defaultProviderId: string | undefined;
  providerKeyExists: Record<string, boolean>;
  isLoading: boolean;
  error: string | undefined;
};

export const unloadedState: AiConfigState = {
  providers: [],
  tools: [],
  defaultProviderId: undefined,
  providerKeyExists: {},
  isLoading: false,
  error: undefined,
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(aiConfigRequestAction, state => {
      state.isLoading = true;
      state.error = undefined;
    })
    .addCase(aiConfigReceiveAction, (state, action) => {
      state.isLoading = false;
      state.providers = action.payload.providers;
      state.tools = action.payload.tools;
      state.defaultProviderId = action.payload.defaultProviderId;
    })
    .addCase(aiConfigKeyStatusReceiveAction, (state, action) => {
      state.isLoading = false;
      state.providerKeyExists = action.payload;
    })
    .addCase(aiConfigErrorAction, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    })
    .addDefaultCase(state => state),
);
