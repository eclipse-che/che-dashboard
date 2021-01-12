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

import { AlertVariant } from '@patternfly/react-core';
import { History } from 'history';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import WorkspaceDetailsPage, { WorkspaceDetails as Details, WorkspaceDetailsTabs } from '../pages/WorkspaceDetails';
import { IdeLoaderTabs } from '../services/helpers/types';

import { AppState } from '../store';
import * as WorkspacesStore from '../store/Workspaces';
import { selectAllWorkspaces, selectIsLoading } from '../store/Workspaces/selectors';

export enum Actions {
  OPEN = 'Open',
  OPEN_IN_VERBOSE_MODE = 'Open in verbose mode',
  START_IN_BACKGROUND = 'Start in background',
  STOP_WORKSPACE = 'Stop Workspace',
  DELETE_WORKSPACE = 'Delete Workspace',
}

type Props =
  MappedProps
  & { history: History }
  & RouteComponentProps<{ namespace: string; workspaceName: string }>; // incoming parameters

class WorkspaceDetails extends React.PureComponent<Props> {
  workspaceDetailsPageRef: React.RefObject<Details>;
  private showAlert: (title: string, variant?: AlertVariant) => void;

  constructor(props: Props) {
    super(props);

    this.workspaceDetailsPageRef = React.createRef<Details>();
    const namespace = this.props.match.params.namespace;
    const workspaceName = (this.props.match.params.workspaceName.split('&'))[0];
    if (workspaceName !== this.props.match.params.workspaceName) {
      const pathname = `/workspace/${namespace}/${workspaceName}`;
      this.props.history.replace({ pathname });
    }

    const workspace = this.props.allWorkspaces?.find(workspace =>
      workspace.namespace === namespace && workspace.devfile.metadata.name === workspaceName);
    if (workspace) {
      this.props.setWorkspaceId(workspace.id);
    }
  }

  public componentDidMount(): void {
    const { allWorkspaces } = this.props;
    if (!allWorkspaces || allWorkspaces.length === 0) {
      this.props.requestWorkspaces();
    }
    const showAlert = this.workspaceDetailsPageRef.current?.showAlert;
    this.showAlert = (title: string, variant?: AlertVariant) => {
      if (showAlert) {
        showAlert(variant ? variant : AlertVariant.danger, title);
      } else {
        console.error(title);
      }
    };
  }

  public componentDidUpdate(): void {
    const namespace = this.props.match.params.namespace;
    const workspaceName = this.props.match.params.workspaceName;

    const workspace = this.props.allWorkspaces?.find(workspace =>
      workspace.namespace === namespace && workspace.devfile.metadata.name === workspaceName);
    if (!workspace && !this.props.isLoading) {
      this.props.history.replace({ pathname: '/workspaces' });
    }
  }

  render() {
    return (
      <WorkspaceDetailsPage
        ref={this.workspaceDetailsPageRef}
        onSave={(workspace: che.Workspace) => this.onSave(workspace)}
        onAction={(action => this.onAction(action))}
      />
    );
  }

  async onAction(action: Actions): Promise<void> {
    const namespace = this.props.match.params.namespace;
    const workspaceName = this.props.match.params.workspaceName;
    const workspace = this.props.allWorkspaces?.find(workspace =>
      workspace.namespace === namespace && workspace.devfile.metadata.name === workspaceName);

    if (!workspace) {
      this.showAlert('Unable to find the workspace');
      return;
    }

    switch (action) {
      case Actions.OPEN:
        this.props.history.replace({ pathname: `/ide/${namespace}/${workspaceName}` });
        break;
      case Actions.OPEN_IN_VERBOSE_MODE:
        try {
          await this.props.startWorkspace(workspace.id, { 'debug-workspace-start': true });
          this.props.history.replace({
            pathname: `/ide/${namespace}/${workspaceName}?tab=${IdeLoaderTabs[IdeLoaderTabs.Logs]}`
          });
        } catch (e) {
          this.showAlert(`Unable to ${Actions.OPEN_IN_VERBOSE_MODE.toLowerCase()}. ${e}`);
        }
        break;
      case Actions.START_IN_BACKGROUND:
        try {
          await this.props.startWorkspace(workspace.id);
        } catch (e) {
          this.showAlert(`Unable to ${Actions.START_IN_BACKGROUND.toLowerCase()}. ${e}`);
        }
        break;
      case Actions.STOP_WORKSPACE:
        try {
          await this.props.stopWorkspace(workspace.id);
        } catch (e) {
          this.showAlert(`Unable to ${Actions.STOP_WORKSPACE.toLowerCase()}. ${e}`);
        }
        break;
    }
  }

  async onSave(newWorkspaceObj: che.Workspace): Promise<void> {
    const namespace = newWorkspaceObj.namespace;
    const workspaceName = newWorkspaceObj.devfile.metadata.name;

    try {
      await this.props.updateWorkspace(newWorkspaceObj);
      this.showAlert('Workspace has been updated', AlertVariant.success);
      const pathname = `/workspace/${namespace}/${workspaceName}`;
      this.props.history.replace({ pathname });
      this.props.setWorkspaceId(newWorkspaceObj.id);
    } catch (e) {
      if (this.workspaceDetailsPageRef.current?.state.activeTabKey === WorkspaceDetailsTabs.Devfile) {
        throw new Error(e.toString().replace(/^Error: /gi, ''));
      }
      this.showAlert('Failed to update workspace data');
    }
  }

}

const mapStateToProps = (state: AppState) => ({
  isLoading: selectIsLoading(state),
  allWorkspaces: selectAllWorkspaces(state),
});

const connector = connect(
  mapStateToProps,
  WorkspacesStore.actionCreators,
);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(WorkspaceDetails);
