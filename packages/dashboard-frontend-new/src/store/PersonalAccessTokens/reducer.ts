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
  tokenAddAction,
  tokenErrorAction,
  tokenReceiveAction,
  tokenRemoveAction,
  tokenRequestAction,
  tokenUpdateAction,
} from '@/store/PersonalAccessTokens/actions';

export interface State {
  isLoading: boolean;
  tokens: api.PersonalAccessToken[];
  error?: string;
}

export const unloadedState: State = {
  isLoading: false,
  tokens: [],
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(tokenRequestAction, state => {
      state.isLoading = true;
    })
    .addCase(tokenReceiveAction, (state, action) => {
      state.isLoading = false;
      state.tokens = action.payload;
    })
    .addCase(tokenAddAction, (state, action) => {
      state.isLoading = false;
      state.tokens.push(action.payload);
    })
    .addCase(tokenUpdateAction, (state, action) => {
      state.isLoading = false;
      state.tokens = state.tokens.map(token =>
        token.tokenName === action.payload.tokenName ? action.payload : token,
      );
    })
    .addCase(tokenRemoveAction, (state, action) => {
      state.isLoading = false;
      state.tokens = state.tokens.filter(token => token.tokenName !== action.payload.tokenName);
    })
    .addCase(tokenErrorAction, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    })
    .addDefaultCase(state => state),
);
