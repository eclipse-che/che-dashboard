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

import { ClusterInfo } from '@eclipse-che/common';
import { createReducer } from '@reduxjs/toolkit';

import {
  clusterInfoErrorAction,
  clusterInfoReceiveAction,
  clusterInfoRequestAction,
} from '@/store/ClusterInfo/actions';

export interface State {
  isLoading: boolean;
  clusterInfo: ClusterInfo;
  error?: string;
}

export const unloadedState: State = {
  isLoading: false,
  clusterInfo: {
    applications: [],
  },
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(clusterInfoRequestAction, state => {
      state.isLoading = true;
      state.error = undefined;
    })
    .addCase(clusterInfoReceiveAction, (state, action) => {
      state.isLoading = false;
      state.clusterInfo = action.payload;
    })
    .addCase(clusterInfoErrorAction, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    })
    .addDefaultCase(state => state),
);
