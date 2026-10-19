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

const selectState = (state: RootState) => state.bootstrap;

export const selectBootstrapIsLoading = createSelector(selectState, state => state.isLoading);

export const selectBootstrapIsReady = createSelector(selectState, state => state.isReady);

export const selectBootstrapError = createSelector(selectState, state => state.error);

export const selectConfig = createSelector(selectState, state => state.config);

export const selectNamespace = createSelector(selectState, state => state.namespace);

export const selectSamplesIndexUrl = createSelector(
  selectState,
  state => state.config.samplesIndexUrl,
);

export const selectDashboardUrl = createSelector(selectState, state => state.config.dashboardUrl);

/** True when the data on screen comes from the in-memory client, not a cluster. */
export const selectIsMockData = createSelector(selectState, state => state.clientMode === 'mock');
