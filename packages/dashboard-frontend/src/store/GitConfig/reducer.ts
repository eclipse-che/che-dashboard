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
  gitConfigErrorAction,
  gitConfigReceiveAction,
  gitConfigRequestAction,
} from '@/store/GitConfig/actions';

export type GitConfig = api.IGitConfig['gitconfig'];

export interface State {
  isLoading: boolean;
  config?: api.IGitConfig;
  error: string | undefined;
}

export const unloadedState: State = {
  isLoading: false,
  config: undefined,
  error: undefined,
};

export const reducer = createReducer(unloadedState, builder => {
  builder
    .addCase(gitConfigRequestAction, state => {
      state.isLoading = true;
    })
    .addCase(gitConfigReceiveAction, (state, action) => {
      state.isLoading = false;
      state.config = action.payload;
    })
    .addCase(gitConfigErrorAction, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    })
    .addDefaultCase(state => state);
});
