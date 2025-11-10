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

import { DevWorkspaceStatus } from '@/services/helpers/types';
import { RootState } from '@/store';
import { selectRunningWorkspacesLimit } from '@/store/ClusterConfig/selectors';

const selectState = (state: RootState) => state.devWorkspaces;
export const selectDevWorkspacesState = selectState;

export const selectDevWorkspacesResourceVersion = createSelector(
  selectState,
  state => state.resourceVersion,
);

export const selectAllDevWorkspaces = createSelector(selectState, state => {
  return state.workspaces;
});

export const selectDevWorkspacesError = createSelector(selectState, state => state.error);

export const selectRunningDevWorkspaces = createSelector(selectState, state =>
  state.workspaces.filter(
    workspace =>
      workspace.status?.phase === DevWorkspaceStatus.STARTING ||
      workspace.status?.phase === DevWorkspaceStatus.RUNNING,
  ),
);

export const selectRunningDevWorkspacesLimitExceeded = createSelector(
  selectRunningDevWorkspaces,
  selectRunningWorkspacesLimit,
  (runningDevWorkspaces, runningWorkspacesLimit) =>
    runningWorkspacesLimit !== -1 && runningDevWorkspaces.length >= runningWorkspacesLimit,
);

export const selectStartedWorkspaces = createSelector(
  selectState,
  state => state.startedWorkspaces,
);

export const selectDevWorkspaceWarnings = createSelector(selectState, state => state.warnings);
