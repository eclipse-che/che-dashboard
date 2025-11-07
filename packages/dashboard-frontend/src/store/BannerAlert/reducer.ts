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

import { bannerAddAction, bannerRemoveAction } from '@/store/BannerAlert/actions';

export interface State {
  messages: string[];
}

export const unloadedState: State = {
  messages: [],
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(bannerAddAction, (state, action) => {
      state.messages.push(action.payload);
    })
    .addCase(bannerRemoveAction, (state, action) => {
      state.messages = state.messages.filter(message => message !== action.payload);
    })
    .addDefaultCase(state => state),
);
