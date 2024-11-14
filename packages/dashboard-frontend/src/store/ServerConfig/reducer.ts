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

import { api } from '@eclipse-che/common';
import { createReducer } from '@reduxjs/toolkit';

import {
  serverConfigErrorAction,
  serverConfigReceiveAction,
  serverConfigRequestAction,
} from '@/store/ServerConfig/actions';

export interface State {
  isLoading: boolean;
  config: api.IServerConfig;
  error?: string;
}

export const unloadedState: State = {
  isLoading: false,
  config: {
    containerBuild: {},
    defaults: {
      editor: undefined,
      components: [],
      plugins: [],
      pvcStrategy: '',
    },
    devfileRegistry: {
      disableInternalRegistry: false,
      externalDevfileRegistries: [],
    },
    pluginRegistry: {
      openVSXURL: '',
    },
    timeouts: {
      inactivityTimeout: -1,
      runTimeout: -1,
      startTimeout: 300,
    },
    defaultNamespace: {
      autoProvision: true,
    },
    cheNamespace: '',
    pluginRegistryURL: '',
    pluginRegistryInternalURL: '',
    allowedSourceUrls: [],
  },
  error: undefined,
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(serverConfigRequestAction, state => {
      state.isLoading = true;
    })
    .addCase(serverConfigReceiveAction, (state, action) => {
      state.isLoading = false;
      state.config = action.payload;
      state.error = undefined;
    })
    .addCase(serverConfigErrorAction, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    })
    .addDefaultCase(state => state),
);
