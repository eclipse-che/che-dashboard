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

import { che } from '@/services/models';
import {
  namespaceErrorAction,
  namespaceReceiveAction,
  namespaceRequestAction,
} from '@/store/InfrastructureNamespaces/actions';

export interface State {
  isLoading: boolean;
  namespaces: che.KubernetesNamespace[];
  error?: string;
}

export const unloadedState: State = {
  isLoading: false,
  namespaces: [],
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(namespaceRequestAction, state => {
      state.isLoading = true;
    })
    .addCase(namespaceReceiveAction, (state, action) => {
      state.isLoading = false;
      state.namespaces = action.payload;
    })
    .addCase(namespaceErrorAction, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    })
    .addDefaultCase(state => state),
);
