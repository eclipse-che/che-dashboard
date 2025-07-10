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

import { ClusterConfig } from '@eclipse-che/common';
import { createReducer } from '@reduxjs/toolkit';

import {
  clusterConfigErrorAction,
  clusterConfigReceiveAction,
  clusterConfigRequestAction,
} from '@/store/ClusterConfig/actions';

export interface State {
  isLoading: boolean;
  clusterConfig: ClusterConfig;
  error?: string;
}

export const unloadedState: State = {
  isLoading: false,
  clusterConfig: {
    runningWorkspacesLimit: 1,
    allWorkspacesLimit: -1,
    currentArchitecture: undefined,
  },
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(clusterConfigRequestAction, state => {
      state.isLoading = true;
      state.error = undefined;
    })
    .addCase(clusterConfigReceiveAction, (state, action) => {
      state.isLoading = false;
      state.clusterConfig = action.payload;
    })
    .addCase(clusterConfigErrorAction, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    })
    .addDefaultCase(state => state),
);
