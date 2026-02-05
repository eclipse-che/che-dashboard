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

import 'reflect-metadata';

import { Content, Divider, PageSection, PageSectionVariants } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import React from 'react';
import { Location, NavigateFunction } from 'react-router-dom';

import Head from '@/components/Head';
import NothingFoundEmptyState from '@/pages/WorkspacesList/EmptyState/NothingFound';
import NoWorkspacesEmptyState from '@/pages/WorkspacesList/EmptyState/NoWorkspaces';
import styles from '@/pages/WorkspacesList/index.module.css';
import { buildRows, getSortParams, RowData, SortDirection } from '@/pages/WorkspacesList/Rows';
import WorkspacesListToolbar from '@/pages/WorkspacesList/Toolbar';
import { BrandingData } from '@/services/bootstrap/branding.constant';
import devfileApi from '@/services/devfileApi';
import { buildGettingStartedLocation } from '@/services/helpers/location';
import { Workspace } from '@/services/workspace-adapter';

type Props = {
  branding: BrandingData;
  editors: devfileApi.Devfile[];
  location: Location;
  navigate: NavigateFunction;
  workspaces: Workspace[];
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

export default class WorkspacesList extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    const filtered = this.props.workspaces.map(workspace => workspace.uid);
    this.state = {
      filtered,
      selected: [],
      isSelectedAll: false,
      rows: [],
      sortBy: {
        index: 1,
        direction: 'asc',
      },
    };
  }

  private buildRows(): RowData[] {
    const { editors, workspaces } = this.props;
    const { filtered, selected, sortBy } = this.state;

    return buildRows(workspaces, editors, [], filtered, selected, sortBy);
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
    const selected = !isSelectedAll ? [] : [...this.state.filtered];

    this.setState({
      selected,
      isSelectedAll,
    });
  }

  private handleSelect(isSelected: boolean, rowData: RowData): void {
    const { workspaces } = this.props;

    /* (un)select specified row */
    const uid = rowData.workspaceUID;
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
    const { workspace: workspacesDocsLink } = this.props.branding.docs;
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
      <React.Fragment>
        <Head pageName="Workspaces" />
        <PageSection variant={PageSectionVariants.default}>
          <Content>
            <Content component="h1">Workspaces</Content>
            <Content component="p">
              A workspace is where your projects live and run. Create workspaces from stacks that
              define projects, runtimes, and commands.&emsp;
              <a href={workspacesDocsLink} target="_blank" rel="noopener noreferrer">
                Learn&nbsp;more&nbsp;
                <ExternalLinkAltIcon />
              </a>
            </Content>
          </Content>
        </PageSection>
        <PageSection variant={PageSectionVariants.default} isFilled={false}>
          <Divider component="div" className="pf-u-mt-xl" />
          {toolbar}
          <Table aria-label="Workspaces List Table" variant="compact">
            <Thead>
              <Tr>
                <Th screenReaderText="Select workspace" />
                <Th
                  sort={getSortParams(0, sortBy.index, sortBy.direction, (index, direction) =>
                    this.handleSort(index, direction),
                  )}
                  className={styles.nameColumnTitle}
                >
                  Name
                </Th>
                <Th
                  sort={getSortParams(1, sortBy.index, sortBy.direction, (index, direction) =>
                    this.handleSort(index, direction),
                  )}
                  className={styles.editorColumnTitle}
                >
                  Editor
                </Th>
                <Th
                  sort={getSortParams(2, sortBy.index, sortBy.direction, (index, direction) =>
                    this.handleSort(index, direction),
                  )}
                  className={styles.lastModifiedColumnTitle}
                >
                  Last Modified
                </Th>
                <Th className={styles.projectsCell}>Project(s)</Th>
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
                      onSelect: (_event, isSelected) => this.handleSelect(isSelected, row),
                      isSelected: row.isSelected,
                      isDisabled: row.isDisabled,
                    }}
                  />
                  <Td dataLabel="Name">{row.cells.details}</Td>
                  <Td dataLabel="Editor">{row.cells.editorIcon}</Td>
                  <Td dataLabel="Last Modified">{row.cells.lastModifiedDate}</Td>
                  <Td dataLabel="Project(s)" className={styles.projectsCell}>
                    {row.cells.projectsList}
                  </Td>
                  <Td className={styles.openIdeCell}>{row.cells.action}</Td>
                  <Td isActionCell className={styles.actionsDropdownCell}>
                    {row.cells.actionsDropdown}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </PageSection>
        {emptyState}
      </React.Fragment>
    );
  }
}
