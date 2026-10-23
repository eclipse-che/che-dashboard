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

import { Sandbox, SandboxError } from '@/services/types';
import {
  sandboxActionClearErrorAction,
  sandboxActionErrorAction,
  sandboxActionReceiveAction,
  sandboxActionRequestAction,
  sandboxChangeAction,
  sandboxesDeleteErrorAction,
  sandboxesDeleteReceiveAction,
  sandboxesDeleteRequestAction,
  sandboxesErrorAction,
  sandboxesReceiveAction,
  sandboxesRequestAction,
} from '@/store/Sandboxes/actions';

export interface State {
  isLoading: boolean;
  /** True once a first answer - list or error - has arrived. */
  isLoaded: boolean;
  sandboxes: Sandbox[];
  /** Version the last list was read at; where the watch starts from. */
  resourceVersion?: string;
  error?: SandboxError;
  /** Name of the sandbox a lifecycle action is currently running against. */
  pendingName?: string;
  /** Names a bulk delete is currently running against. */
  deletingNames?: string[];
  actionError?: SandboxError;
}

export const unloadedState: State = {
  isLoading: false,
  isLoaded: false,
  sandboxes: [],
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(sandboxesRequestAction, state => {
      // A resync must not blank the table, so the spinner is only claimed
      // while nothing has been shown yet.
      state.isLoading = !state.isLoaded;
    })
    .addCase(sandboxesReceiveAction, (state, action) => {
      state.isLoading = false;
      state.isLoaded = true;
      state.sandboxes = action.payload.sandboxes;
      state.resourceVersion = action.payload.resourceVersion;
      state.error = undefined;
    })
    .addCase(sandboxChangeAction, (state, action) => {
      const { type, sandbox } = action.payload;
      const index = state.sandboxes.findIndex(item => item.metadata.name === sandbox.metadata.name);

      if (type === 'DELETED') {
        if (index !== -1) {
          state.sandboxes.splice(index, 1);
        }
      } else if (index === -1) {
        state.sandboxes.push(sandbox);
      } else {
        state.sandboxes[index] = sandbox;
      }

      // A watch event is an answer too: the table is live even if the initial
      // list failed.
      state.isLoaded = true;
      state.isLoading = false;
    })
    .addCase(sandboxesErrorAction, (state, action) => {
      state.isLoading = false;
      state.isLoaded = true;
      state.error = action.payload;
    })
    .addCase(sandboxActionRequestAction, (state, action) => {
      state.pendingName = action.payload;
      state.actionError = undefined;
    })
    .addCase(sandboxActionReceiveAction, state => {
      state.pendingName = undefined;
    })
    .addCase(sandboxActionErrorAction, (state, action) => {
      state.pendingName = undefined;
      state.actionError = action.payload;
    })
    .addCase(sandboxesDeleteRequestAction, (state, action) => {
      state.deletingNames = action.payload;
      state.actionError = undefined;
    })
    .addCase(sandboxesDeleteReceiveAction, state => {
      state.deletingNames = undefined;
    })
    .addCase(sandboxesDeleteErrorAction, (state, action) => {
      state.deletingNames = undefined;
      state.actionError = action.payload;
    })
    .addCase(sandboxActionClearErrorAction, state => {
      state.actionError = undefined;
    })
    .addDefaultCase(state => state),
);
