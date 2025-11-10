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

import { V1Pod } from '@kubernetes/client-node';
import { createReducer } from '@reduxjs/toolkit';

import { getNewerResourceVersion } from '@/services/helpers/resourceVersion';
import {
  podDeleteAction,
  podListErrorAction,
  podListReceiveAction,
  podListRequestAction,
  podModifyAction,
  podReceiveAction,
} from '@/store/Pods/actions';
import isSamePod from '@/store/Pods/isSamePod';

export interface State {
  isLoading: boolean;
  pods: V1Pod[];
  resourceVersion: string;
  error?: string;
}

export const unloadedState: State = {
  isLoading: false,
  pods: [],
  resourceVersion: '0',
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(podListRequestAction, state => {
      state.isLoading = true;
      state.error = undefined;
    })
    .addCase(podListReceiveAction, (state, action) => {
      state.isLoading = false;
      state.pods = action.payload.pods;
      state.resourceVersion = getNewerResourceVersion(
        action.payload.resourceVersion,
        state.resourceVersion,
      );
    })
    .addCase(podListErrorAction, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    })
    .addCase(podReceiveAction, (state, action) => {
      state.pods.push(action.payload);
      state.resourceVersion = getNewerResourceVersion(
        action.payload.metadata?.resourceVersion,
        state.resourceVersion,
      );
    })
    .addCase(podModifyAction, (state, action) => {
      state.pods = state.pods.map(pod => (isSamePod(pod, action.payload) ? action.payload : pod));
      state.resourceVersion = getNewerResourceVersion(
        action.payload.metadata?.resourceVersion,
        state.resourceVersion,
      );
    })
    .addCase(podDeleteAction, (state, action) => {
      state.pods = state.pods.filter(pod => isSamePod(pod, action.payload) === false);
      state.resourceVersion = getNewerResourceVersion(
        action.payload.metadata?.resourceVersion,
        state.resourceVersion,
      );
    })
    .addDefaultCase(state => state),
);
