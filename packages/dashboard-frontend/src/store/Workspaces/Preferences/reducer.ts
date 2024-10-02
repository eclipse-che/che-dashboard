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
  preferencesErrorAction,
  preferencesReceiveAction,
  preferencesRequestAction,
} from '@/store/Workspaces/Preferences/actions';

export interface State {
  isLoading: boolean;
  preferences: api.IWorkspacePreferences;
  error?: string;
}

export const unloadedState: State = {
  isLoading: false,
  preferences: {
    'skip-authorisation': [],
  } as api.IWorkspacePreferences,
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(preferencesRequestAction, state => {
      state.isLoading = true;
    })
    .addCase(preferencesReceiveAction, (state, action) => {
      state.isLoading = false;
      if (action.payload) {
        state.preferences = action.payload;
      } else {
        // trusted resources update
        // no-op
      }
    })
    .addCase(preferencesErrorAction, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    })
    .addDefaultCase(state => state),
);
