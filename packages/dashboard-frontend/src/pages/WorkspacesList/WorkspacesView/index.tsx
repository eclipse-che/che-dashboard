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

import { BackupInfo } from '@eclipse-che/common';
import React from 'react';
import { NavigateFunction } from 'react-router-dom';

import NothingFoundEmptyState from '@/pages/WorkspacesList/EmptyState/NothingFound';
import NoWorkspacesEmptyState from '@/pages/WorkspacesList/EmptyState/NoWorkspaces';
import { buildRows, RowData, SortDirection } from '@/pages/WorkspacesList/Rows';
import WorkspacesListToolbar from '@/pages/WorkspacesList/WorkspacesView/Toolbar';
import { WorkspacesTable } from '@/pages/WorkspacesList/WorkspacesView/WorkspacesTable';
import { BrandingData } from '@/services/bootstrap/branding.constant';
import devfileApi from '@/services/devfileApi';
import { buildGettingStartedLocation } from '@/services/helpers/location';
import { Workspace } from '@/services/workspace-adapter';

type Props = {
  workspaces: Workspace[];
  editors: devfileApi.Devfile[];
  backupsByWorkspace: Record<string, BackupInfo>;
  branding: BrandingData;
  navigate: NavigateFunction;
};

type State = {
  filtered: string[]; // UIDs of filtered workspaces
  selected: string[]; // UIDs of selected workspaces
  isSelectedAll: boolean;
  rows: RowData[];
  sortBy: {
    index: number;
    direction: SortDirection;
  };
};

export class WorkspacesView extends React.PureComponent<Props, State> {
  private readonly columns = [
    { title: 'Name', dataLabel: 'Name', sortable: true },
    { title: 'Editor', dataLabel: 'Editor', sortable: true },
    { title: 'Last Modified', dataLabel: 'Last Modified', sortable: true },
    { title: 'Backup Status', dataLabel: 'Backup Status' },
    { title: 'Project(s)', dataLabel: 'Project(s)' },
    { title: '', dataLabel: ' ', screenReaderText: 'Open' },
    { title: '', dataLabel: ' ', screenReaderText: 'Open' },
    { title: '', dataLabel: ' ', screenReaderText: 'Actions' },
  ];

  constructor(props: Props) {
    super(props);

    const filtered = this.props.workspaces.map(workspace => workspace.uid);
    this.state = {
      filtered,
      selected: [],
      isSelectedAll: false,
      rows: [],
      sortBy: {
        index: 2, // Last Modified column
        direction: 'asc',
      },
    };
  }

  private buildRows(): RowData[] {
    const { backupsByWorkspace, editors, workspaces } = this.props;
    const { filtered, selected, sortBy } = this.state;

    return buildRows(workspaces, editors, [], filtered, selected, sortBy, backupsByWorkspace);
  }

  private handleFilter(filtered: Workspace[]): void {
    const selected = filtered
      .map(workspace => workspace.uid)
      .filter(uid => this.state.selected.includes(uid));
    const isSelectedAll = selected.length !== 0 && selected.length === filtered.length;
    this.setState({
      filtered: filtered.map(workspace => workspace.uid),
      selected,
      isSelectedAll,
    });
  }

  private handleSelectAll(isSelectedAll: boolean): void {
    const selected = isSelectedAll === false ? [] : [...this.state.filtered];

    this.setState({
      selected,
      isSelectedAll,
    });
  }

  private handleSelect(isSelected: boolean, rowIndex: number): void {
    const { workspaces } = this.props;
    const rows = this.buildRows();
    const uid = rows[rowIndex]?.workspaceUID;
    if (!uid) return;

    const selected = [...this.state.selected];
    const idx = selected.indexOf(uid);
    if (idx === -1) {
      if (isSelected) {
        selected.push(uid);
      }
    } else {
      if (!isSelected) {
        selected.splice(idx, 1);
      }
    }
    const isSelectedAll = selected.length !== 0 && selected.length === workspaces.length;
    this.setState({
      selected,
      isSelectedAll,
    });
  }

  private handleAddWorkspace(): void {
    const location = buildGettingStartedLocation();
    this.props.navigate(location);
  }

  private handleSort(index: number, direction: SortDirection): void {
    this.setState({
      sortBy: {
        index,
        direction,
      },
    });
  }

  public componentDidUpdate(prevProps: Props): void {
    const prevUIDs = prevProps.workspaces
      .map(w => w.uid)
      .sort()
      .join(',');
    const UIDs = this.props.workspaces
      .map(w => w.uid)
      .sort()
      .join(',');
    if (prevUIDs !== UIDs) {
      const selected: string[] = [];
      const filtered: string[] = [];
      this.props.workspaces.forEach(workspace => {
        if (this.state.selected.indexOf(workspace.uid) !== -1) {
          selected.push(workspace.uid);
        }
        filtered.push(workspace.uid);
      });
      const isSelectedAll =
        selected.length !== 0 && selected.length === this.props.workspaces.length;
      this.setState({
        filtered,
        isSelectedAll,
        selected,
      });
    }
  }

  public render(): React.ReactElement {
    const { workspaces } = this.props;
    const { selected, isSelectedAll, sortBy } = this.state;
    const rows = this.buildRows();

    const toolbar = (
      <WorkspacesListToolbar
        selected={selected}
        workspaces={workspaces}
        selectedAll={isSelectedAll}
        onAddWorkspace={() => this.handleAddWorkspace()}
        onBulkDelete={async () => {
          // no-op
        }}
        onFilter={filtered => this.handleFilter(filtered)}
        onToggleSelectAll={isSelectedAll => this.handleSelectAll(isSelectedAll)}
      />
    );

    let emptyState: React.ReactElement = <></>;
    if (workspaces.length === 0) {
      emptyState = <NoWorkspacesEmptyState onAddWorkspace={() => this.handleAddWorkspace()} />;
    } else if (rows.length === 0) {
      emptyState = <NothingFoundEmptyState />;
    }

    return (
      <>
        <WorkspacesTable
          columns={this.columns}
          rows={rows}
          sortBy={sortBy}
          onSelect={(isSelected, rowIndex) => this.handleSelect(isSelected, rowIndex)}
          onSort={(index, direction) => this.handleSort(index, direction)}
          toolbar={toolbar}
        />
        {emptyState}
      </>
    );
  }
}

export default WorkspacesView;
