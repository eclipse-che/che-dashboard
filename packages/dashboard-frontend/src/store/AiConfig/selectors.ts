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

const selectState = (state: RootState) => state.aiConfig;

export const selectAiProviders = createSelector(selectState, state => state.providers);

export const selectAiTools = createSelector(selectState, state => state.tools);

export const selectDefaultAiProvider = createSelector(
  selectState,
  state => state.defaultProviderId,
);

export const selectAiProviderKeyExists = createSelector(
  selectState,
  state => state.providerKeyExists,
);

export const selectAiConfigIsLoading = createSelector(selectState, state => state.isLoading);

export const selectAiConfigError = createSelector(selectState, state => state.error);
