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

import { SandboxSample } from '@/services/samples';
import { SandboxError } from '@/services/types';
import {
  sampleCreateClearErrorAction,
  sampleCreateErrorAction,
  sampleCreateReceiveAction,
  sampleCreateRequestAction,
  sampleManifestCloseAction,
  sampleManifestErrorAction,
  sampleManifestReceiveAction,
  sampleManifestRequestAction,
  samplesErrorAction,
  samplesReceiveAction,
  samplesRequestAction,
} from '@/store/Samples/actions';

export interface State {
  isLoading: boolean;
  isLoaded: boolean;
  samples: SandboxSample[];
  error?: SandboxError;
  /** Identifier of the sample a sandbox is currently being created from. */
  pendingId?: string;
  createError?: SandboxError;
  /** Identifier of the sample whose manifest the preview is showing. */
  manifestId?: string;
  manifestContent?: string;
  manifestError?: SandboxError;
}

export const unloadedState: State = {
  isLoading: false,
  isLoaded: false,
  samples: [],
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(samplesRequestAction, state => {
      state.isLoading = !state.isLoaded;
    })
    .addCase(samplesReceiveAction, (state, action) => {
      state.isLoading = false;
      state.isLoaded = true;
      state.samples = action.payload;
      state.error = undefined;
    })
    .addCase(samplesErrorAction, (state, action) => {
      state.isLoading = false;
      state.isLoaded = true;
      state.error = action.payload;
    })
    .addCase(sampleCreateRequestAction, (state, action) => {
      state.pendingId = action.payload;
      state.createError = undefined;
    })
    .addCase(sampleCreateReceiveAction, state => {
      state.pendingId = undefined;
    })
    .addCase(sampleCreateErrorAction, (state, action) => {
      state.pendingId = undefined;
      state.createError = action.payload;
    })
    .addCase(sampleCreateClearErrorAction, state => {
      state.createError = undefined;
    })
    .addCase(sampleManifestRequestAction, (state, action) => {
      state.manifestId = action.payload;
      state.manifestContent = undefined;
      state.manifestError = undefined;
    })
    .addCase(sampleManifestReceiveAction, (state, action) => {
      state.manifestContent = action.payload;
    })
    .addCase(sampleManifestErrorAction, (state, action) => {
      state.manifestError = action.payload;
    })
    .addCase(sampleManifestCloseAction, state => {
      state.manifestId = undefined;
      state.manifestContent = undefined;
      state.manifestError = undefined;
    })
    .addDefaultCase(state => state),
);
