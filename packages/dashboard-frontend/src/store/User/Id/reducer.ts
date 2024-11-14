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

import { createReducer } from '@reduxjs/toolkit';

import {
  cheUserIdErrorAction,
  cheUserIdReceiveAction,
  cheUserIdRequestAction,
} from '@/store/User/Id/actions';

export interface State {
  cheUserId: string;
  error?: string;
  isLoading: boolean;
}

export const unloadedState: State = {
  cheUserId: '',
  isLoading: false,
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(cheUserIdRequestAction, state => {
      state.isLoading = true;
    })
    .addCase(cheUserIdReceiveAction, (state, action) => {
      state.isLoading = false;
      state.cheUserId = action.payload;
    })
    .addCase(cheUserIdErrorAction, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    })
    .addDefaultCase(state => state),
);
