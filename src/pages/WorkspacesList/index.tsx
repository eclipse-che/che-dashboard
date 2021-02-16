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

import 'reflect-metadata';
import React from 'react';
import {
  classNames,
  IAction,
  ICell,
  IRowData,
  sortable,
  SortByDirection,
  Table,
  TableBody,
  TableHeader,
  TableVariant,
  Visibility,
} from '@patternfly/react-table';
import { History } from 'history';
import {
  AlertVariant,
  Divider,
  PageSection,
  PageSectionVariants,
  Text,
  TextContent,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { BrandingData } from '../../services/bootstrap/branding.constant';
import { WorkspaceAction, WorkspaceStatus } from '../../services/helpers/types';
import Head from '../../components/Head';
import { buildGettingStartedPath } from '../../services/helpers/location';
import { AppAlerts } from '../../services/alerts/appAlerts';
import getRandomString from '../../services/helpers/random';
import WorkspacesListToolbar from './Toolbar';
import { lazyInject } from '../../inversify.config';
import NoWorkspacesEmptyState from './EmptyState/NoWorkspaces';
import NothingFoundEmptyState from './EmptyState/NothingFound';
import { buildRows, RowData } from './Rows';

import * as styles from './index.module.css';

type Props = {
  branding: BrandingData;
  history: History;
  workspaces: che.Workspace[];
  isDeleted: string[];
  onAction: (action: WorkspaceAction, id: string) => Promise<string | void>;
  showConfirmation: (wantDelete: string[]) => Promise<void>;
};
type State = {
  filtered: string[]; // IDs of filtered workspaces
  selected: string[]; // IDs of selected workspaces
  isSelectedAll: boolean;
  rows: RowData[];
  sortBy: {
    index: number;
    direction: SortByDirection;
  };
}

export default class WorkspacesList extends React.PureComponent<Props, State> {

  @lazyInject(AppAlerts)
  private appAlerts: AppAlerts;

  private columns: (ICell | string)[];

  constructor(props: Props) {
    super(props);

    this.columns = [
      {
        title: (<span className={styles.nameColumnTitle}>Name</span>),
        dataLabel: 'Name',
        transforms: [sortable],
      },
      {
        title: 'Last Modified',
        dataLabel: 'Last Modified',
        transforms: [sortable, classNames(styles.lastModifiedColumnTitle)],
      },
      {
        title: 'Project(s)',
        dataLabel: 'Project(s)',
        cellTransforms: [classNames(styles.projectsCell)],
      },
      { // Column is visible only on Sm
        // content is aligned to the left
        title: '',
        dataLabel: ' ',
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        columnTransforms: [classNames(Visibility.visibleOnSm!, Visibility.hiddenOnMd!)],
      },
      { // Column is hidden only on Sm
        // content is aligned to the right
        title: '',
        dataLabel: ' ',
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        cellTransforms: [classNames(styles.openIdeCell, Visibility.hidden!, Visibility.hiddenOnSm!, Visibility.visibleOnMd!)],
      }
    ];

    const filtered = this.props.workspaces.map(workspace => workspace.id);
    this.state = {
      filtered,
      selected: [],
      isSelectedAll: false,
      rows: [],
      sortBy: {
        index: 1,
        direction: SortByDirection.asc,
      },
    };
  }

  private showAlert(message: string, variant = AlertVariant.warning): void {
    this.appAlerts.showAlert({
      key: 'workspaces-list-' + getRandomString(4),
      title: message,
      variant,
    });
  }

  private buildRows(): RowData[] {
    const { history, isDeleted, workspaces } = this.props;
    const { filtered, selected, sortBy } = this.state;

    return buildRows(history, workspaces, isDeleted, filtered, selected, sortBy);
  }

  private actionResolver(rowData: IRowData): IAction[] {
    const id = (rowData as RowData).props.workspaceId;
    const workspace = this.props.workspaces.find(workspace => id === workspace.id);

    if (!workspace) {
      console.warn('Unable to build list of actions: Workspace not found.');
      return [];
    }

    return [
      {
        title: 'Open in Verbose Mode',
        isDisabled: false === this.isEnabledAction(WorkspaceAction.START_DEBUG_AND_OPEN_LOGS, WorkspaceStatus[workspace.status]),
        onClick: (event, rowId, rowData) => this.handleAction(WorkspaceAction.START_DEBUG_AND_OPEN_LOGS, rowData),

      },
      {
        title: 'Start in Background',
        isDisabled: false === this.isEnabledAction(WorkspaceAction.START_IN_BACKGROUND, WorkspaceStatus[workspace.status]),
        onClick: (event, rowId, rowData) => this.handleAction(WorkspaceAction.START_IN_BACKGROUND, rowData)
      },
      {
        title: 'Stop Workspace',
        isDisabled: false === this.isEnabledAction(WorkspaceAction.STOP_WORKSPACE, WorkspaceStatus[workspace.status]),
        onClick: (event, rowId, rowData) => this.handleAction(WorkspaceAction.STOP_WORKSPACE, rowData)
      },
      {
        title: 'Delete Workspace',
        onClick: (event, rowId, rowData) => this.handleAction(WorkspaceAction.DELETE_WORKSPACE, rowData)
      },
    ];
  }

  private isEnabledAction(action: WorkspaceAction, status: WorkspaceStatus): boolean {
    if (action === WorkspaceAction.START_DEBUG_AND_OPEN_LOGS
      || action === WorkspaceAction.START_IN_BACKGROUND) {
      switch (status) {
        case WorkspaceStatus.STARTING:
        case WorkspaceStatus.RUNNING:
        case WorkspaceStatus.STOPPING:
          return false;
        default:
          return true;
      }
    }
    if (action === WorkspaceAction.STOP_WORKSPACE) {
      switch (status) {
        case WorkspaceStatus.STARTING:
        case WorkspaceStatus.RUNNING:
          return true;
        default:
          return false;
      }
    }

    return true;
  }

  private async handleAction(action: WorkspaceAction, rowData: IRowData): Promise<void> {
    const id = (rowData as RowData).props.workspaceId;
    try {

      if (action === WorkspaceAction.DELETE_WORKSPACE) {
        // show confirmation window
        const workspace = this.props.workspaces.find(workspace => id === workspace.id);
        const workspaceName = workspace?.devfile.metadata.name || id;
        try {
          await this.props.showConfirmation([workspaceName]);
        } catch (e) {
          return;
        }
      }

      const nextPath = await this.props.onAction(action, id);
      if (!nextPath) {
        return;
      }
      this.props.history.push(nextPath);
    } catch (e) {
      const workspace = this.props.workspaces.find(workspace => id === workspace.id);
      const workspaceName = workspace?.devfile.metadata.name ? ` "${workspace?.devfile.metadata.name}"` : '';
      const message = `Unable to ${action.toLocaleLowerCase()}${workspaceName}. ` + e.toString().replace('Error: ', '');
      this.showAlert(message);
      console.warn(message);
    }
  }

  private async handleBulkDelete(): Promise<void> {
    const { selected } = this.state;
    const { workspaces } = this.props;

    // show confirmation window
    try {
      const wantDelete = selected.map(id => {
        const workspace = workspaces.find(workspace => id === workspace.id);
        return workspace?.devfile.metadata.name || id;
      });
      await this.props.showConfirmation(wantDelete);
    } catch (e) {
      return;
    }

    const promises = selected.map(async id => {
      try {
        await this.props.onAction(WorkspaceAction.DELETE_WORKSPACE, id);
        return id;
      } catch (e) {
        const workspace = this.props.workspaces.find(workspace => id === workspace.id);
        const workspaceName = workspace?.devfile.metadata.name ? ` "${workspace?.devfile.metadata.name}"` : '';
        const message = `Unable to delete workspace${workspaceName}. ` + e.toString().replace('Error: ', '');
        this.showAlert(message);
        console.warn(message);
        throw new Error(message);
      }
    });

    try {
      const results = await Promise.allSettled(promises);

      let fulfilled = 0;
      let rejected = 0;
      const { selected } = this.state;
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          fulfilled += 1;
          const idx = selected.indexOf(result.value);
          if (idx !== -1) {
            selected.splice(idx, 1);
          }
        } else {
          rejected += 1;
        }
      });
      this.setState({
        selected,
      });

      if (!rejected) {
        const message = promises.length === 1
          ? 'The workspace was deleted successfully'
          : `${promises.length} workspaces were deleted successfully.`;
        this.showAlert(message, AlertVariant.success);
      } else if (rejected === promises.length) {
        const message = 'No workspaces were deleted.';
        this.showAlert(message, AlertVariant.warning);
      } else {
        const message = fulfilled === 1
          ? `${fulfilled} of ${promises.length} workspaces was deleted.`
          : `${fulfilled} of ${promises.length} workspaces were deleted. `;
        this.showAlert(message, AlertVariant.warning);
      }
    } catch (e) {
      const message = `Bulk workspaces deletion failed due to ${e}.`;
      console.error(message);
      this.showAlert(message, AlertVariant.danger);
    }
  }

  private handleFilter(filtered: che.Workspace[]): void {
    const selected = filtered
      .map(workspace => workspace.id)
      .filter(id => this.state.selected.includes(id));
    const isSelectedAll = selected.length !== 0 && selected.length === filtered.length;
    this.setState({
      filtered: filtered.map(workspace => workspace.id),
      selected,
      isSelectedAll,
    });
  }

  private handleSelectAll(isSelectedAll: boolean): void {
    const selected = isSelectedAll === false
      ? []
      : [...this.state.filtered];

    this.setState({
      selected,
      isSelectedAll,
    });
  }

  private handleSelect(isSelected: boolean, rowIndex: number, rowData?: IRowData): void {
    const { workspaces } = this.props;

    if (rowIndex === -1) {
      /* (un)select all */
      const isSelectedAll = isSelected;
      const selected = isSelectedAll === false
        ? []
        : workspaces.map(workspace => workspace.id);
      this.setState({
        selected,
        isSelectedAll,
      });
      return;
    }

    /* (un)select specified row */
    const id = (rowData as RowData).props.workspaceId;
    const selected = [...this.state.selected];
    const idx = selected.indexOf(id);
    if (idx === -1) {
      if (isSelected) {
        selected.push(id);
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

  private areActionsDisabled(rowData: IRowData): boolean {
    const id = (rowData as RowData).props.workspaceId;
    return this.props.isDeleted.includes(id);
  }

  private handleAddWorkspace(): void {
    const path = buildGettingStartedPath('custom-workspace');
    this.props.history.push(path);
  }

  private handleSort(event: React.MouseEvent, index: number, direction: SortByDirection): void {
    this.setState({
      sortBy: {
        index,
        direction,
      },
    });
  }

  public componentDidUpdate(prevProps: Props): void {
    /* Update checkboxes states if workspaces list changes */
    if (prevProps.workspaces.length !== this.props.workspaces.length) {
      const selected: string[] = [];
      const filtered: string[] = [];
      this.props.workspaces.forEach(workspace => {
        if (this.state.selected.indexOf(workspace.id) !== -1) {
          selected.push(workspace.id);
        }
        if (this.state.filtered.indexOf(workspace.id) !== -1) {
          filtered.push(workspace.id);
        }
      });
      const isSelectedAll = selected.length !== 0 && selected.length === this.props.workspaces.length;
      this.setState({
        filtered,
        isSelectedAll,
        selected,
      });
    }
    /* Update checkboxes states if workspaces are deleting */
    if (prevProps.isDeleted.length !== this.props.isDeleted.length) {
      const selected = this.state.selected.filter(id => false === this.props.isDeleted.includes(id));
      this.setState({
        selected,
      });
    }
  }

  public render(): React.ReactElement {
    const { workspaces } = this.props;
    const { workspace: workspacesDocsLink } = this.props.branding.docs;
    const { selected, isSelectedAll, sortBy } = this.state;
    const rows = this.buildRows();

    const toolbar = (<WorkspacesListToolbar
      workspaces={workspaces}
      selectedAll={isSelectedAll}
      enabledDelete={selected.length !== 0}
      onAddWorkspace={() => this.handleAddWorkspace()}
      onBulkDelete={() => this.handleBulkDelete()}
      onFilter={filtered => this.handleFilter(filtered)}
      onToggleSelectAll={isSelectedAll => this.handleSelectAll(isSelectedAll)}
    />);

    let emptyState: React.ReactElement = (<></>);
    if (workspaces.length === 0) {
      emptyState = <NoWorkspacesEmptyState onAddWorkspace={() => this.handleAddWorkspace()} />;
    } else if (rows.length === 0) {
      emptyState = <NothingFoundEmptyState />;
    }

    return (
      <React.Fragment>
        <Head pageName="Workspaces" />
        <PageSection variant={PageSectionVariants.light}>
          <TextContent>
            <Text component={'h1'}>Workspaces</Text>
            <Text component={'p'}>
              A workspace is where your projects live and run.
              Create workspaces from stacks that define projects, runtimes, and commands.&emsp;
              <a
                href={workspacesDocsLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn&nbsp;more&nbsp;
                <ExternalLinkAltIcon />
              </a>
            </Text>
          </TextContent>
        </PageSection>
        <PageSection
          padding={{ default: 'noPadding' }}
          variant={PageSectionVariants.light}
          isFilled={false}
        >
          <Divider component="div" className="pf-u-mt-xl" />
          <Table
            actionResolver={rowData => this.actionResolver(rowData)}
            areActionsDisabled={rowData => this.areActionsDisabled(rowData)}
            aria-label="Workspaces List Table"
            canSelectAll={false}
            cells={this.columns}
            onSelect={(event, isSelected, rowIndex, rowData) => this.handleSelect(isSelected, rowIndex, rowData)}
            rows={rows}
            variant={TableVariant.compact}
            header={toolbar}
            sortBy={sortBy}
            onSort={(event, index, direction) => this.handleSort(event, index, direction)}
          >
            <TableHeader />
            <TableBody />
          </Table>
        </PageSection>
        {emptyState}
      </React.Fragment>
    );
  }

}
