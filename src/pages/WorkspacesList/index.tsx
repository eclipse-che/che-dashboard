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

import {
  Button,
  PageSection,
  PageSectionVariants,
  Text,
} from '@patternfly/react-core';
import { Table, TableBody, TableHeader } from '@patternfly/react-table';
import { History } from 'history';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import Head from '../../components/Head';
import CheProgress from '../../components/Progress';
import WorkspaceDeleteAction from '../../components/Workspace/DeleteAction';
import WorkspaceIndicator from '../../components/Workspace/Indicator';
import WorkspaceRunAction from '../../components/Workspace/RunAction';
import WorkspaceStopAction from '../../components/Workspace/StopAction';
import { container } from '../../inversify.config';
import { Debounce } from '../../services/helpers/debounce';
import { WorkspaceStatus } from '../../services/helpers/types';
import { AppState } from '../../store';
import * as WorkspacesStore from '../../store/Workspaces';
import { selectAllWorkspacesByName, selectIsLoading } from '../../store/Workspaces/selectors';

import './WorkspacesList.styl';

const SECTION_THEME = PageSectionVariants.light;

type Props =
  MappedProps
  & {
    history: History
  };

export class WorkspacesList extends React.PureComponent<Props> {
  private debounce: Debounce;

  constructor(props: Props) {
    super(props);

    this.debounce = container.get(Debounce);
  }

  private buildWorkspaceRow(workspace: che.Workspace): React.ReactNodeArray {
    const actions = this.buildActions(workspace);
    return ([
      <span
        key={`${workspace.id}_1`}
        onClick={() => this.onRowClick(workspace)}
      >
        <WorkspaceIndicator
          key={`${workspace.id}_1_1`}
          status={workspace.status}
        />
        {workspace.namespace}/{workspace.devfile.metadata.name}
      </span>,
      <span
        key={`${workspace.id}_2`}
        onClick={() => this.onRowClick(workspace)}
      >
        -
      </span>,
      <span
        key={`${workspace.id}_3`}
        onClick={() => this.onRowClick(workspace)}
      >
        {workspace.devfile.projects ? workspace.devfile.projects.length : '-'}
      </span>,
      <span
        key={`${workspace.id}_4`}
        onClick={() => this.onRowClick(workspace)}
      >
        {workspace.attributes && workspace.attributes.stackName ? workspace.attributes.stackName : ''}
      </span>,
      <span key={`${workspace.id}_5`}>
        {actions}
      </span>
    ]);
  }

  private buildActions(workspace: che.Workspace): React.ReactNode {
    const status = WorkspaceStatus[workspace.status];
    const disabled = status === WorkspaceStatus.STARTING || status === WorkspaceStatus.STOPPING;

    // run and stop actions
    let runStopAction: React.ReactNode;
    if (status === WorkspaceStatus.STARTING || status === WorkspaceStatus.RUNNING) {
      const stopDisabled = status === WorkspaceStatus.STOPPING;
      runStopAction = (
        <WorkspaceStopAction
          key={`run_${workspace.id}`}
          workspaceId={workspace.id}
          disabled={stopDisabled}
        />
      );
    } else {
      runStopAction = (
        <WorkspaceRunAction
          key={`stop_${workspace.id}`}
          workspaceId={workspace.id}
          disabled={disabled}
        />
      );
    }

    // delete actions
    const deleteAction = (
      <WorkspaceDeleteAction
        key={`delete_${workspace.id}${workspace.status}`}
        workspaceId={workspace.id}
        workspaceName={workspace.devfile.metadata.name}
        status={WorkspaceStatus[workspace.status]}
        disabled={disabled}
      />
    );

    return (
      <React.Fragment>
        {runStopAction}
        {deleteAction}
      </React.Fragment>);
  }

  private onRowClick(workspace: che.Workspace): void {
    this.props.history.push(`/workspace/${workspace.namespace}/${workspace.devfile.metadata.name}`);
  }

  public render(): React.ReactElement {

    const allWorkspaces = this.props.allWorkspaces || [];

    const columns = ['NAME', 'RAM', 'PROJECTS', 'STACK', 'ACTIONS'];
    const rows = allWorkspaces.map((workspace: che.Workspace) => ({
      cells: this.buildWorkspaceRow(workspace)
    })) || [];

    const { workspace } = this.props.branding.data.docs;

    return (
      <React.Fragment>
        <Head pageName="Workspaces" />
        <PageSection variant={SECTION_THEME}>
          <Text className='page-label' component='h1'>Workspaces</Text>
        </PageSection>
        <Text className='page-description' component='p'>
          A workspace is where your projects live and run.
          Create workspaces from stacks that define projects, runtimes, and commands.
          <a href={workspace}>Learn more.</a>
        </Text>
        <CheProgress isLoading={this.props.isLoading} />
        <PageSection variant={SECTION_THEME} className='header-buttons'>
          <Button onClick={(): void => this.props.history.push('/')} variant='primary'>
            Add Workspace
          </Button>
        </PageSection>
        <PageSection variant={SECTION_THEME}>
          {rows.length === 0 ? (<Text component='p' className='workspaces-list-empty-state'>
            There are no workspaces.
          </Text>) :
            (<Table cells={columns}
              rows={rows}
              aria-label='Workspaces'>
              <TableHeader className='workspaces-list-table-header' />
              <TableBody className='workspaces-list-table-body' />
            </Table>)}
        </PageSection>
      </React.Fragment>
    );
  }

}

const mapStateToProps = (state: AppState) => {
  const { branding } = state;
  return {
    branding,
    isLoading: selectIsLoading(state),
    allWorkspaces: selectAllWorkspacesByName(state),
  };
};

const connector = connect(
  mapStateToProps,
  WorkspacesStore.actionCreators,
);
type MappedProps = ConnectedProps<typeof connector>;
export default connector(WorkspacesList);
