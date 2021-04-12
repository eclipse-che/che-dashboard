/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { createSelector } from 'reselect';
import { AppState } from '../';
import { convertWorkspace, Workspace } from '../../services/workspaceAdapter';
import * as storageTypesService from '../../services/storageTypes';

const selectState = (state: AppState) => state.workspaces;
const selectCheWorkspacesState = (state: AppState) => state.cheWorkspaces;
const selectDevWorkspacesState = (state: AppState) => state.devWorkspaces;

export const selectIsLoading = createSelector(
  selectState,
  state => state.isLoading,
);

export const selectSettings = createSelector(
  selectCheWorkspacesState,
  cheWorkspacesState => cheWorkspacesState.settings,
);

export const selectAvailableStorageTypes = createSelector(
  selectSettings,
  settings => storageTypesService.getAvailable(settings)
);

export const selectPreferredStorageType = createSelector(
  selectSettings,
  settings => storageTypesService.getPreferred(settings)
);

export const selectLogs = createSelector(
  selectCheWorkspacesState,
  selectDevWorkspacesState,
  (cheWorkspacesState, devWorkspacesState) => {
    return new Map([...cheWorkspacesState.workspacesLogs, ...devWorkspacesState.workspacesLogs]);
  },
);

export const selectAllWorkspaces = createSelector(
  selectCheWorkspacesState,
  selectDevWorkspacesState,
  (cheWorkspacesState, devWorkspacesState) => {
    return [
      ...cheWorkspacesState.workspaces,
      ...devWorkspacesState.workspaces,
    ].map(workspace => convertWorkspace(workspace));
  }
);

export const selectWorkspaceByQualifiedName = createSelector(
  selectState,
  selectAllWorkspaces,
  (state, allWorkspaces) => {
    if (!allWorkspaces) {
      return null;
    }
    return allWorkspaces.find(workspace =>
      workspace.namespace === state.namespace && workspace.name === state.workspaceName);
  }
);

export const selectWorkspaceById = createSelector(
  selectState,
  selectAllWorkspaces,
  (state, allWorkspaces) => {
    if (!allWorkspaces) {
      return null;
    }
    return allWorkspaces.find(workspace => workspace.id === state.workspaceId);
  }
);

export const selectAllWorkspacesByName = createSelector(
  selectAllWorkspaces,
  allWorkspaces => {
    if (!allWorkspaces) {
      return null;
    }
    return allWorkspaces.sort(sortByNamespaceNameFn);
  }
);
const sortByNamespaceNameFn = (workspaceA: Workspace, workspaceB: Workspace): -1 | 0 | 1 => {
  return sortByNamespaceFn(workspaceA, workspaceB)
    || sortByNameFn(workspaceA, workspaceB);
};
const sortByNamespaceFn = (workspaceA: Workspace, workspaceB: Workspace): -1 | 0 | 1 => {
  if (workspaceA.namespace > workspaceB.namespace) {
    return 1;
  } else if (workspaceA.namespace < workspaceB.namespace) {
    return -1;
  } else {
    return 0;
  }
};
const sortByNameFn = (workspaceA: Workspace, workspaceB: Workspace): -1 | 0 | 1 => {
  if (workspaceA.name > workspaceB.name) {
    return 1;
  } else if (workspaceA.name < workspaceB.name) {
    return -1;
  } else {
    return 0;
  }
};

export const selectAllWorkspacesSortedByTime = createSelector(
  selectAllWorkspaces,
  allWorkspaces => {
    if (!allWorkspaces) {
      return null;
    }
    return allWorkspaces.sort(sortByUpdatedTimeFn);
  }
);
const sortByUpdatedTimeFn = (workspaceA: Workspace, workspaceB: Workspace): -1 | 0 | 1 => {
  const timeA = workspaceA.updated || workspaceA.created || 0;
  const timeB = workspaceB.updated || workspaceB.created || 0;
  if (timeA > timeB) {
    return -1;
  } else if (timeA < timeB) {
    return 1;
  } else {
    return 0;
  }
};

const selectRecentNumber = createSelector(
  selectState,
  state => state.recentNumber
);
export const selectRecentWorkspaces = createSelector(
  selectRecentNumber,
  selectAllWorkspacesSortedByTime,
  (recentNumber, workspacesSortedByTime) => {
    if (!workspacesSortedByTime) {
      return null;
    }

    return workspacesSortedByTime.slice(0, recentNumber);
  }
);
export const selectAllWorkspacesNumber = createSelector(
  selectAllWorkspaces,
  allWorkspaces => {
    return allWorkspaces.length;
  }
);
