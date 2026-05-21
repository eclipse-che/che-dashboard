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

import { DevfileSchema } from '@/services/backend-client/devfileSchemaApi';
import {
  devfileSchemaErrorAction,
  devfileSchemaReceiveAction,
  devfileSchemaRequestAction,
} from '@/store/DevfileSchema/actions';

export interface State {
  isLoading: boolean;
  schema: DevfileSchema | undefined;
  error?: string;
}

export const unloadedState: State = {
  isLoading: false,
  schema: undefined,
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(devfileSchemaRequestAction, state => {
      state.isLoading = true;
      state.error = undefined;
    })
    .addCase(devfileSchemaReceiveAction, (state, action) => {
      state.isLoading = false;
      state.schema = action.payload;
    })
    .addCase(devfileSchemaErrorAction, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    })
    .addDefaultCase(state => state),
);
