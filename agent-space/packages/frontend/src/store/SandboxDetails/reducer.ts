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

import { Sandbox, SandboxError, SandboxEvent } from '@/services/types';
import {
  sandboxDetailsErrorAction,
  sandboxDetailsEventsErrorAction,
  sandboxDetailsEventsReceiveAction,
  sandboxDetailsReceiveAction,
  sandboxDetailsRequestAction,
  sandboxDetailsUpdateAction,
} from '@/store/SandboxDetails/actions';
import { sandboxChangeAction, sandboxesReceiveAction } from '@/store/Sandboxes/actions';

export interface State {
  isLoading: boolean;
  isLoaded: boolean;
  /** Sandbox the rest of the state describes; the page shows one at a time. */
  name?: string;
  sandbox?: Sandbox;
  events: SandboxEvent[];
  error?: SandboxError;
  /** Set when listing the events failed, which is not a failure of the page. */
  eventsError?: SandboxError;
}

export const unloadedState: State = {
  isLoading: false,
  isLoaded: false,
  events: [],
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(sandboxDetailsRequestAction, (state, action) => {
      if (state.name !== action.payload) {
        // Another sandbox: drop what is on screen rather than showing the
        // previous one's manifest under the new name.
        state.name = action.payload;
        state.sandbox = undefined;
        state.events = [];
        state.isLoaded = false;
        state.error = undefined;
        state.eventsError = undefined;
      }
      state.isLoading = !state.isLoaded;
    })
    .addCase(sandboxDetailsReceiveAction, (state, action) => {
      state.isLoading = false;
      state.isLoaded = true;
      state.name = action.payload.name;
      state.sandbox = action.payload.sandbox;
      state.events = action.payload.events;
      state.error = undefined;
      state.eventsError = action.payload.eventsError;
    })
    .addCase(sandboxDetailsErrorAction, (state, action) => {
      state.isLoading = false;
      state.isLoaded = true;
      state.name = action.payload.name;
      state.error = action.payload.error;
    })
    .addCase(sandboxDetailsEventsReceiveAction, (state, action) => {
      if (state.name === action.payload.name) {
        state.events = action.payload.events;
        state.eventsError = undefined;
      }
    })
    .addCase(sandboxDetailsEventsErrorAction, (state, action) => {
      if (state.name === action.payload.name) {
        state.eventsError = action.payload.error;
      }
    })
    .addCase(sandboxDetailsUpdateAction, (state, action) => {
      if (state.name === action.payload.metadata.name) {
        state.sandbox = action.payload;
        state.error = undefined;
      }
    })
    .addCase(sandboxChangeAction, (state, action) => {
      // The namespace-wide watch also feeds this page, so a sandbox that is
      // suspended from somewhere else updates here without a request.
      const { type, sandbox } = action.payload;
      if (state.name !== sandbox.metadata.name) {
        return;
      }
      state.sandbox = type === 'DELETED' ? undefined : sandbox;
      state.isLoading = false;
      state.isLoaded = true;
    })
    .addCase(sandboxesReceiveAction, (state, action) => {
      // A list is also how the watch recovers: when the stream breaks, changes
      // that happened in the meantime arrive this way and not as events. The
      // page has to take them, or it would sit on a status that stopped being
      // true the moment the stream died.
      if (state.name === undefined) {
        return;
      }
      const sandbox = action.payload.sandboxes.find(item => item.metadata.name === state.name);
      // Only an answer about this sandbox counts. A list that does not mention
      // it may be a namespace the page is not showing, so the manifest stays
      // until the details request says otherwise.
      if (sandbox !== undefined) {
        state.sandbox = sandbox;
        state.isLoading = false;
        state.isLoaded = true;
      }
    })
    .addDefaultCase(state => state),
);
