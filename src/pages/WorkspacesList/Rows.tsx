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

import React from 'react';
import { History } from 'history';
import { IRow, SortByDirection } from '@patternfly/react-table';
import WorkspaceIndicator from '../../components/Workspace/Indicator';
import { formatDate, formatRelativeDate } from '../../services/helpers/date';
import { buildDetailsPath, toHref, buildIdeLoaderPath } from '../../services/helpers/location';

export interface RowData extends IRow {
  props: {
    workspaceId: string;
  };
}

export function buildRows(
  history: History,
  workspaces: che.Workspace[],
  deleted: string[],
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
        const nameA = workspaceA.devfile.metadata.name || '';
        const nameB = workspaceB.devfile.metadata.name || '';
        return sort(nameA, nameB, sortBy.direction);
      }
      if (sortBy.index === 2) {
        const updatedA = workspaceA.attributes?.updated || workspaceA.attributes?.created || 0;
        const updatedB = workspaceB.attributes?.updated || workspaceB.attributes?.created || 0;
        return sort(updatedA, updatedB, sortBy.direction);
      }
      return 0;
    })
    .forEach(workspace => {
      const isSelected = selected.includes(workspace.id);
      const deleting = deleted.includes(workspace.id);

      const pathToDetails = buildDetailsPath(workspace);
      const linkToDetails = toHref(history, pathToDetails);

      const pathToIde = buildIdeLoaderPath(workspace);
      const linkToIde = toHref(history, pathToIde);

      try {
        rows.push(buildRow(workspace, isSelected, deleting, linkToDetails, linkToIde));
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
  workspace: che.Workspace,
  isSelected: boolean,
  isDeleted: boolean,
  linkToDetails: string,
  linkToIde: string
): RowData {
  if (!workspace.devfile.metadata.name) {
    throw new Error('Empty workspace name.');
  }
  if (!workspace.attributes) {
    throw new Error('Empty workspace attributes');
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
      <a href={linkToDetails}>{workspace.devfile.metadata.name}</a>
    </span>
  );

  /* last modified time */
  const { created, updated } = workspace.attributes;
  const lastModifiedMs = parseInt(updated ? updated : created, 10);
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
  const workspaceProjects = workspace.devfile.projects || [];
  const projects = workspaceProjects
    .map(project => project.source?.location || project.name)
    .join(', \n') || '-';

  /* Open IDE link */
  let open: React.ReactElement | string;
  if (isDeleted) {
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
        title: projects,
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
    disableCheckbox: isDeleted,
  };
}
