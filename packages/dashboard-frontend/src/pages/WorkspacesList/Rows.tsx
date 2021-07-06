/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import React from 'react';
import { History } from 'history';
import { IRow, SortByDirection } from '@patternfly/react-table';
import WorkspaceIndicator from '../../components/Workspace/Indicator';
import { formatDate, formatRelativeDate } from '../../services/helpers/date';
import { buildDetailsLocation, toHref, buildIdeLoaderLocation } from '../../services/helpers/location';
import { isWorkspaceV1, Workspace } from '../../services/workspaceAdapter';
import { IDevWorkspaceDevfile } from '@eclipse-che/devworkspace-client';
import { DevWorkspaceStatus } from '../../services/helpers/types';

export interface RowData extends IRow {
  props: {
    workspaceId: string;
  };
}

export function buildRows(
  history: History,
  workspaces: Workspace[],
  toDelete: string[],
  filtered: string[],
  selected: string[],
  sortBy: { index: number, direction: SortByDirection }
): RowData[] {
  const rows: RowData[] = [];
  workspaces
    // skip workspaces that are not match a filter
    .filter(workspace => filtered.includes(workspace.id))
    .sort((workspaceA, workspaceB) => {
      if (sortBy.index === 1) {
        const nameA = workspaceA.name || '';
        const nameB = workspaceB.name || '';
        return sort(nameA, nameB, sortBy.direction);
      }
      if (sortBy.index === 2) {
        const updatedA = workspaceA.updated || workspaceA.created || 0;
        const updatedB = workspaceB.updated || workspaceB.created || 0;
        return sort(updatedA, updatedB, sortBy.direction);
      }
      return 0;
    })
    .forEach(workspace => {
      const isSelected = selected.includes(workspace.id);
      const isDeleted = toDelete.includes(workspace.id);

      const locationToDetails = buildDetailsLocation(workspace);
      const linkToDetails = toHref(history, locationToDetails);

      const locationToIde = buildIdeLoaderLocation(workspace);
      const linkToIde = toHref(history, locationToIde);

      try {
        rows.push(buildRow(workspace, isSelected, isDeleted, linkToDetails, linkToIde));
      } catch (e) {
        console.warn('Skip workspace: ', e);
      }
    });
  return rows;
}

function sort(a: string | number, b: string | number, direction: SortByDirection): -1 | 0 | 1 {
  if (a > b) {
    return direction === SortByDirection.asc ? 1 : -1;
  } else if (a < b) {
    return direction === SortByDirection.asc ? -1 : 1;
  }
  return 0;
}

export function buildRow(
  workspace: Workspace,
  isSelected: boolean,
  isDeleted: boolean,
  linkToDetails: string,
  linkToIde: string
): RowData {
  if (!workspace.name) {
    throw new Error('Empty workspace name.');
  }
  if (!workspace.namespace) {
    throw new Error('Empty namespace');
  }

  /* workspace status indicator */
  const statusIndicator = (<WorkspaceIndicator status={workspace.status} />);
  /* workspace name */
  const details = (
    <span>
      {statusIndicator}
      <a href={linkToDetails}>{workspace.name}</a>
    </span>
  );

  /* last modified time */
  const lastModifiedMs = workspace.updated ? workspace.updated : workspace.created;
  let lastModifiedDate = '';
  if (lastModifiedMs) {
    const nowMs = Date.now();
    // show relative date if last modified withing an hour
    if (nowMs - lastModifiedMs < 60 * 60 * 1000) {
      lastModifiedDate = formatRelativeDate(lastModifiedMs);
    } else {
      lastModifiedDate = formatDate(lastModifiedMs);
    }
  }

  /* projects list */
  const projects: string[] = [];
  if (isWorkspaceV1(workspace.ref)) {
    const devfile = workspace.devfile as che.WorkspaceDevfile;
    (devfile.projects || [])
      .map(project => project.name || project.source?.location)
      .filter((projectName?: string) => projectName)
      .forEach((projectName: string) => projects.push(projectName));
  } else {
    const devfile = workspace.devfile as IDevWorkspaceDevfile;
    (devfile.projects || [])
      .map(project => project.name || project.git?.remotes?.origin)
      .filter((projectName?: string) => projectName)
      .forEach((projectName: string) => projects.push(projectName));
  }
  const projectsList = projects.join(', \n') || '-';

  /* Open IDE link */
  let open: React.ReactElement | string;
  if (isDeleted || workspace.status === DevWorkspaceStatus.TERMINATING) {
    open = 'deleting...';
  } else {
    open = <a href={linkToIde}>Open</a>;
  }

  return {
    cells: [
      {
        title: details,
        key: 'workspace-name',
      },
      {
        title: lastModifiedDate,
        key: 'last-modified-time'
      },
      {
        title: projectsList,
        key: 'projects-list'
      },
      {
        // Cell is visible only on Sm
        title: open,
        key: 'open-ide-visible-sm'
      },
      {
        // Cell is hidden only on Sm
        title: open,
        key: 'open-ide-hidden-sm',
      },
    ],
    props: {
      workspaceId: workspace.id,
    },
    selected: isSelected || isDeleted,
    disableSelection: isDeleted,
  };
}
