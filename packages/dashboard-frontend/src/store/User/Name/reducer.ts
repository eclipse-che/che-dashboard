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
  usernameErrorAction,
  usernameReceiveAction,
  usernameRequestAction,
} from '@/store/User/Name/actions';

export interface State {
  username: string;
  error?: string;
  isLoading: boolean;
}

export const unloadedState: State = {
  username: 'unknown',
  isLoading: false,
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(usernameRequestAction, state => {
      state.isLoading = true;
    })
    .addCase(usernameReceiveAction, (state, action) => {
      state.isLoading = false;
      state.username = action.payload;
    })
    .addCase(usernameErrorAction, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    })
    .addDefaultCase(state => state),
);
