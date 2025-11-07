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

import {
  dockerConfigErrorAction,
  dockerConfigReceiveAction,
  dockerConfigRequestAction,
} from '@/store/DockerConfig/actions';

export type RegistryEntry = {
  url: string;
  username?: string;
  password?: string;
};

export interface State {
  isLoading: boolean;
  registries: RegistryEntry[];
  error: string | undefined;
}

export const unloadedState: State = {
  isLoading: false,
  registries: [],
  error: undefined,
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(dockerConfigRequestAction, state => {
      state.isLoading = true;
      state.error = undefined;
    })
    .addCase(dockerConfigReceiveAction, (state, action) => {
      state.isLoading = false;
      state.registries = action.payload.registries;
    })
    .addCase(dockerConfigErrorAction, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    })
    .addDefaultCase(state => state),
);
