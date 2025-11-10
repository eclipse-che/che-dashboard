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

import {
  qualifiedNameClearAction,
  qualifiedNameSetAction,
  workspaceUIDClearAction,
  workspaceUIDSetAction,
} from '@/store/Workspaces/actions';

export interface State {
  isLoading: boolean;

  // current workspace qualified name
  namespace: string;
  workspaceName: string;
  workspaceUID: string;
  // number of recent workspaces
  recentNumber: number;
}

export const unloadedState: State = {
  isLoading: false,

  namespace: '',
  workspaceName: '',
  workspaceUID: '',

  recentNumber: 5,
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(qualifiedNameClearAction, state => {
      state.namespace = '';
      state.workspaceName = '';
    })
    .addCase(qualifiedNameSetAction, (state, action) => {
      state.namespace = action.payload.namespace;
      state.workspaceName = action.payload.workspaceName;
    })
    .addCase(workspaceUIDClearAction, state => {
      state.workspaceUID = '';
    })
    .addCase(workspaceUIDSetAction, (state, action) => {
      state.workspaceUID = action.payload;
    })
    .addDefaultCase(state => state),
);
