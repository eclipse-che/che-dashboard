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
import * as storageTypesService from '../../services/storageTypes';

const selectState = (state: AppState) => state.workspaces;

export const selectIsLoading = createSelector(
  selectState,
  state => state.isLoading,
);

export const selectSettings = createSelector(
  selectState,
  state => state.settings,
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
  selectState,
  state => state.workspacesLogs,
);

export const selectAllWorkspaces = createSelector(
  selectState,
  state => {
    return state.workspaces;
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
      workspace.namespace === state.namespace && workspace.devfile.metadata.name === state.workspaceName);
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
const sortByNamespaceNameFn = (workspaceA: che.Workspace, workspaceB: che.Workspace): -1 | 0 | 1 => {
  return sortByNamespaceFn(workspaceA, workspaceB)
    || sortByNameFn(workspaceA, workspaceB);
};
const sortByNamespaceFn = (workspaceA: che.Workspace, workspaceB: che.Workspace): -1 | 0 | 1 => {
  const namespaceA = workspaceA.namespace || '';
  const namespaceB = workspaceB.namespace || '';
  if (namespaceA > namespaceB) {
    return 1;
  } else if (namespaceA < namespaceB) {
    return -1;
  } else {
    return 0;
  }
};
const sortByNameFn = (workspaceA: che.Workspace, workspaceB: che.Workspace): -1 | 0 | 1 => {
  const nameA = workspaceA.devfile.metadata.name || '';
  const nameB = workspaceB.devfile.metadata.name || '';
  if (nameA > nameB) {
    return 1;
  } else if (nameA < nameB) {
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
const sortByUpdatedTimeFn = (workspaceA: che.Workspace, workspaceB: che.Workspace): -1 | 0 | 1 => {
  const timeA = (workspaceA.attributes
    && (workspaceA.attributes.updated || workspaceA.attributes.created)) || 0;
  const timeB = (workspaceB.attributes
    && (workspaceB.attributes.updated || workspaceB.attributes.created)) || 0;
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
