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

import { AgentSpaceConfig, DEFAULT_CONFIG } from '@/services/config';
import { AgentSandboxClient, SandboxError } from '@/services/types';
import {
  bootstrapErrorAction,
  bootstrapReceiveAction,
  bootstrapRequestAction,
} from '@/store/Bootstrap/actions';

export interface State {
  isLoading: boolean;
  /** True once the configuration, the client and the namespace are all known. */
  isReady: boolean;
  config: AgentSpaceConfig;
  namespace: string;
  /** Where the cluster console lives, or empty when there is none. */
  clusterConsoleUrl: string;
  clientMode?: AgentSandboxClient['mode'];
  error?: SandboxError;
}

export const unloadedState: State = {
  isLoading: false,
  isReady: false,
  config: DEFAULT_CONFIG,
  namespace: '',
  clusterConsoleUrl: '',
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(bootstrapRequestAction, state => {
      state.isLoading = true;
      state.error = undefined;
    })
    .addCase(bootstrapReceiveAction, (state, action) => {
      state.isLoading = false;
      state.isReady = true;
      state.config = action.payload.config;
      state.namespace = action.payload.namespace;
      state.clusterConsoleUrl = action.payload.clusterConsoleUrl;
      state.clientMode = action.payload.clientMode;
    })
    .addCase(bootstrapErrorAction, (state, action) => {
      state.isLoading = false;
      state.isReady = false;
      state.clientMode = undefined;
      state.error = action.payload;
    })
    .addDefaultCase(state => state),
);
