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

import { CoreV1Event } from '@kubernetes/client-node';
import { createReducer } from '@reduxjs/toolkit';

import { getNewerResourceVersion } from '@/services/helpers/resourceVersion';
import {
  eventDeleteAction,
  eventErrorAction,
  eventModifyAction,
  eventsReceiveAction,
  eventsRequestAction,
} from '@/store/Events/actions';

export interface State {
  isLoading: boolean;
  events: CoreV1Event[];
  resourceVersion: string;
  error?: string;
}

export const unloadedState: State = {
  isLoading: false,
  events: [],
  resourceVersion: '0',
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(eventsRequestAction, state => {
      state.isLoading = true;
    })
    .addCase(eventsReceiveAction, (state, action) => {
      state.isLoading = false;
      state.events = state.events.concat(action.payload.events);
      state.resourceVersion = getNewerResourceVersion(
        action.payload.resourceVersion,
        state.resourceVersion,
      );
    })
    .addCase(eventModifyAction, (state, action) => {
      state.events = state.events.map(event => {
        if (event.metadata.uid === action.payload.event.metadata.uid) {
          return action.payload.event;
        }
        return event;
      });
      state.resourceVersion = getNewerResourceVersion(
        action.payload.event.metadata.resourceVersion,
        state.resourceVersion,
      );
    })
    .addCase(eventDeleteAction, (state, action) => {
      state.events = state.events.filter(
        event => event.metadata.uid !== action.payload.event.metadata.uid,
      );
      state.resourceVersion = getNewerResourceVersion(
        action.payload.event.metadata.resourceVersion,
        state.resourceVersion,
      );
    })
    .addCase(eventErrorAction, (state, action) => {
      state.isLoading = false;
      state.error = action.payload.error;
    })
    .addDefaultCase(state => state),
);
