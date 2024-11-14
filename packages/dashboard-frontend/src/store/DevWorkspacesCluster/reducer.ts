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
  devWorkspacesClusterErrorAction,
  devWorkspacesClusterReceiveAction,
  devWorkspacesClusterRequestAction,
} from '@/store/DevWorkspacesCluster/actions';

export interface State {
  isLoading: boolean;
  isRunningDevWorkspacesClusterLimitExceeded: boolean;
  error?: string;
}

export const unloadedState: State = {
  isLoading: false,
  isRunningDevWorkspacesClusterLimitExceeded: false,
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(devWorkspacesClusterRequestAction, state => {
      state.isLoading = true;
      state.error = undefined;
    })
    .addCase(devWorkspacesClusterReceiveAction, (state, action) => {
      state.isLoading = false;
      state.isRunningDevWorkspacesClusterLimitExceeded = action.payload;
    })
    .addCase(devWorkspacesClusterErrorAction, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    })
    .addDefaultCase(state => state),
);
