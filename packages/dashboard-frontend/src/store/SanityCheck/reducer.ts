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
  backendCheckErrorAction,
  backendCheckReceiveAction,
  backendCheckRequestAction,
} from '@/store/SanityCheck/actions';

export interface State {
  authorized: boolean;
  lastFetched: number;
  error?: string;
}

export const unloadedState: State = {
  authorized: true,
  lastFetched: 0,
};

export const reducer = createReducer(unloadedState, builder => {
  builder
    .addCase(backendCheckRequestAction, (state, action) => {
      state.lastFetched = action.payload.lastFetched;
    })
    .addCase(backendCheckReceiveAction, state => {
      state.authorized = true;
      state.error = undefined;
    })
    .addCase(backendCheckErrorAction, (state, action) => {
      state.authorized = false;
      state.error = action.payload;
    })
    .addDefaultCase(state => state);
});
