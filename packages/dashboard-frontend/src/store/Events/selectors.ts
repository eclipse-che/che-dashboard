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
import { selectAllDevWorkspaces } from '@/store/Workspaces/devWorkspaces/selectors';

const selectState = (state: RootState) => state.events;

export const selectAllEvents = createSelector(selectState, state => state.events);

// Lightweight selector that extracts only {id, name} from raw DevWorkspace state.
// This avoids constructing full Workspace adapter objects on every workspace status
// update, so selectEventsFromResourceVersion only recomputes when workspace
// identifiers actually change (not on every status patch).
const selectWorkspaceIdNamePairs = createSelector(selectAllDevWorkspaces, devWorkspaces =>
  devWorkspaces.map(dw => ({
    id: dw.status?.devworkspaceId ?? 'workspace' + dw.metadata.uid.split('-').slice(0, 3).join(''),
    name: dw.metadata.name,
  })),
);

export const selectEventsFromResourceVersion = createSelector(
  selectAllEvents,
  selectWorkspaceIdNamePairs,
  (allEvents, allWorkspaces) => {
    // Pre-build the sets of all workspace IDs and names once per selector invocation.
    const allWorkspaceIds = allWorkspaces.map(w => w.id);
    const allWorkspaceNames = allWorkspaces.map(w => w.name);

    return (
      fromResourceVersionStr: string,
      currentWorkspaceId?: string,
      currentWorkspaceName?: string,
    ) => {
      return allEvents.filter(event => {
        if (event.metadata.resourceVersion === undefined) {
          return false;
        }
        const resourceVersion = parseInt(event.metadata.resourceVersion, 10);
        const fromResourceVersion = parseInt(fromResourceVersionStr, 10);
        if (isNaN(resourceVersion) || isNaN(fromResourceVersion)) {
          return false;
        }
        if (fromResourceVersion > resourceVersion) {
          return false;
        }

        if (currentWorkspaceId === undefined) {
          return true;
        }

        // Blocklist approach: hide events that belong to a DIFFERENT workspace.
        // Events for the current workspace (id-prefix match or exact name match) and
        // events not associated with any devworkspace are all kept.
        const objName = event.involvedObject?.name ?? '';

        const belongsToOtherWorkspace =
          allWorkspaceIds.some(
            id => id !== currentWorkspaceId && (objName === id || objName.startsWith(id + '-')),
          ) || allWorkspaceNames.some(name => name !== currentWorkspaceName && objName === name);

        return !belongsToOtherWorkspace;
      });
    };
  },
);

export const selectEventsError = createSelector(selectState, state => state.error);

export const selectEventsResourceVersion = createSelector(
  selectState,
  state => state.resourceVersion,
);
