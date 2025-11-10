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
  userProfileErrorAction,
  userProfileReceiveAction,
  userProfileRequestAction,
} from '@/store/User/Profile/actions';

export interface State {
  userProfile: api.IUserProfile;
  error?: string;
  isLoading: boolean;
}

export const unloadedState: State = {
  userProfile: {
    email: '',
    username: 'unknown',
  },
  isLoading: false,
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(userProfileRequestAction, state => {
      state.isLoading = true;
    })
    .addCase(userProfileReceiveAction, (state, action) => {
      state.isLoading = false;
      state.userProfile = action.payload;
    })
    .addCase(userProfileErrorAction, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    })
    .addDefaultCase(state => state),
);
