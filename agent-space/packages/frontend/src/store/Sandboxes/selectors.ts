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

const selectState = (state: RootState) => state.sandboxes;

export const selectSandboxes = createSelector(selectState, state => state.sandboxes);

/**
 * True until the first answer arrives. A resync of an already rendered list is
 * not "loading", otherwise every reconnect would flash the spinner.
 */
export const selectSandboxesIsLoading = createSelector(
  selectState,
  state => state.isLoading || !state.isLoaded,
);

export const selectSandboxesError = createSelector(selectState, state => state.error);

export const selectSandboxActionPendingName = createSelector(
  selectState,
  state => state.pendingName,
);

export const selectSandboxesDeletingNames = createSelector(
  selectState,
  state => state.deletingNames,
);

export const selectSandboxActionError = createSelector(selectState, state => state.actionError);
