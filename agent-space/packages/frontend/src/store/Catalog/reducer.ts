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

import { Catalog, EMPTY_CATALOG } from '@/services/catalog';
import { SandboxError } from '@/services/types';
import {
  catalogErrorAction,
  catalogReceiveAction,
  catalogRequestAction,
} from '@/store/Catalog/actions';

export interface State {
  isLoading: boolean;
  isLoaded: boolean;
  catalog: Catalog;
  error?: SandboxError;
}

export const unloadedState: State = {
  isLoading: false,
  isLoaded: false,
  catalog: EMPTY_CATALOG,
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(catalogRequestAction, state => {
      state.isLoading = !state.isLoaded;
    })
    .addCase(catalogReceiveAction, (state, action) => {
      state.isLoading = false;
      state.isLoaded = true;
      state.catalog = action.payload;
      state.error = undefined;
    })
    .addCase(catalogErrorAction, (state, action) => {
      state.isLoading = false;
      state.isLoaded = true;
      state.error = action.payload;
    })
    .addDefaultCase(state => state),
);
