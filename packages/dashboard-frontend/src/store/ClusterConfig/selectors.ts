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

import { Architecture } from '@eclipse-che/common';
import { createSelector } from '@reduxjs/toolkit';

import { RootState } from '@/store';

const selectState = (state: RootState) => state.clusterConfig;

export const selectDashboardWarning = createSelector(
  selectState,
  state => state.clusterConfig.dashboardWarning || '',
);

export const selectRunningWorkspacesLimit = createSelector(selectState, state => {
  return state.clusterConfig.runningWorkspacesLimit;
});

export const selectAllWorkspacesLimit = createSelector(
  selectState,
  state => state.clusterConfig.allWorkspacesLimit,
);

export const selectClusterConfigError = createSelector(selectState, state => state.error);

export const selectDashboardFavicon = createSelector(
  selectState,
  state => state.clusterConfig.dashboardFavicon,
);

export const selectCurrentArchitecture = createSelector(
  selectState,
  state => state.clusterConfig.currentArchitecture as Architecture,
);
