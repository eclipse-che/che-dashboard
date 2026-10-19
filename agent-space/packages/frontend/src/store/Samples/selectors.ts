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

import { createSelector } from '@reduxjs/toolkit';

import { RootState } from '@/store';

const selectState = (state: RootState) => state.samples;

export const selectSamples = createSelector(selectState, state => state.samples);

/** True until the first answer arrives; see the sandbox list selector. */
export const selectSamplesIsLoading = createSelector(
  selectState,
  state => state.isLoading || !state.isLoaded,
);

export const selectSamplesError = createSelector(selectState, state => state.error);

export const selectSampleCreatePendingId = createSelector(selectState, state => state.pendingId);

export const selectSampleCreateError = createSelector(selectState, state => state.createError);

export const selectSampleManifestId = createSelector(selectState, state => state.manifestId);

export const selectSampleManifestContent = createSelector(
  selectState,
  state => state.manifestContent,
);

export const selectSampleManifestError = createSelector(selectState, state => state.manifestError);

/** The preview is open with nothing to show yet. */
export const selectSampleManifestIsLoading = createSelector(
  selectState,
  state =>
    state.manifestId !== undefined &&
    state.manifestContent === undefined &&
    state.manifestError === undefined,
);
