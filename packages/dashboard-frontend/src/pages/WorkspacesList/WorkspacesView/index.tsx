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

import { api, BackupConfig, BackupInfo } from '@eclipse-che/common';
import { Divider, PageSection, PageSectionVariants } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import React from 'react';
import { NavigateFunction } from 'react-router-dom';

import NothingFoundEmptyState from '@/pages/WorkspacesList/EmptyState/NothingFound';
import NoWorkspacesEmptyState from '@/pages/WorkspacesList/EmptyState/NoWorkspaces';
import { buildRows, getSortParams, RowData, SortDirection } from '@/pages/WorkspacesList/Rows';
import WorkspacesListToolbar from '@/pages/WorkspacesList/WorkspacesView/Toolbar';
import { BrandingData } from '@/services/bootstrap/branding.constant';
import devfileApi from '@/services/devfileApi';
import { buildGettingStartedLocation } from '@/services/helpers/location';
import { Workspace } from '@/services/workspace-adapter';

type Props = {
  backupConfig?: BackupConfig;
  workspaces: Workspace[];
  editors: devfileApi.Devfile[];
  backupsByWorkspace: Record<string, BackupInfo>;
  aiTools: api.AiToolDefinition[];
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
  constructor(props: Props) {
    super(props);

    const filtered = this.props.workspaces.map(workspace => workspace.uid);
    this.state = {
      filtered,
      selected: [],
      isSelectedAll: false,
      rows: [],
      sortBy: {
        index: 3, // Last Modified column
        direction: 'asc',
      },
    };
  }

  private buildRows(): RowData[] {
    const { aiTools, backupsByWorkspace, editors, workspaces } = this.props;
    const { filtered, selected, sortBy } = this.state;

    return buildRows(
      workspaces,
      editors,
      [],
      filtered,
      selected,
      sortBy,
      backupsByWorkspace,
      aiTools,
    );
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

    const showBackupStatus = !!this.props.backupConfig?.registry;
    const columns = [
      { title: 'Name', dataLabel: 'Name', sortable: true },
      { title: 'Editor', dataLabel: 'Editor', sortable: true },
      { title: 'AI Provider', dataLabel: 'AI Provider' },
      { title: 'Last Modified', dataLabel: 'Last Modified', sortable: true },
      ...(showBackupStatus ? [{ title: 'Backup Status', dataLabel: 'Backup Status' }] : []),
      { title: 'Project(s)', dataLabel: 'Project(s)' },
    ];

    return (
      <>
        <PageSection
          padding={{ default: 'noPadding' }}
          variant={PageSectionVariants.default}
          isFilled={false}
        >
          <Divider component="div" className="pf-u-mt-xl" />
          {toolbar}
          <Table aria-label="Workspaces List Table" variant="compact">
            <Thead>
              <Tr>
                <Th screenReaderText="Select workspace" />
                {columns.map((col, colIndex) => (
                  <Th
                    key={colIndex}
                    sort={
                      col.sortable
                        ? getSortParams(
                            colIndex,
                            sortBy.index,
                            sortBy.direction,
                            (index, direction) => this.handleSort(index, direction),
                          )
                        : undefined
                    }
                  >
                    {col.title}
                  </Th>
                ))}
                <Th screenReaderText="Open" />
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((row, rowIndex) => (
                <Tr key={row.workspaceUID} style={{ verticalAlign: 'middle' }}>
                  <Td
                    style={{ verticalAlign: 'inherit' }}
                    select={{
                      rowIndex,
                      onSelect: (_event, isSelected) => this.handleSelect(isSelected, rowIndex),
                      isSelected: row.isSelected,
                      isDisabled: row.isDisabled,
                    }}
                  />
                  <Td dataLabel="Name">{row.cells.details}</Td>
                  <Td dataLabel="Editor">{row.cells.editorIcon}</Td>
                  <Td dataLabel="AI Provider">{row.cells.aiTool}</Td>
                  <Td dataLabel="Last Modified">{row.cells.lastModifiedDate}</Td>
                  {showBackupStatus && <Td dataLabel="Backup Status">{row.cells.backupStatus}</Td>}
                  <Td dataLabel="Project(s)">{row.cells.projectsList}</Td>
                  <Td>{row.cells.action}</Td>
                  <Td isActionCell>{row.cells.actionsDropdown}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </PageSection>
        {emptyState}
      </>
    );
  }
}

export default WorkspacesView;
