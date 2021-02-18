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
import WorkspaceDetails, { WorkspaceDetails as Details } from '../pages/WorkspaceDetails';
import { ROUTE } from '../route.enum';
import { toHref } from '../services/helpers/location';
import { WorkspaceDetailsTab } from '../services/helpers/types';

import { AppState } from '../store';
import * as WorkspacesStore from '../store/Workspaces';
import { selectAllWorkspaces, selectIsLoading } from '../store/Workspaces/selectors';

type Props =
  MappedProps
  & { history: History }
  & RouteComponentProps<{ namespace: string; workspaceName: string }>; // incoming parameters

class WorkspaceDetailsContainer extends React.PureComponent<Props> {
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
    const workspacesLink = toHref(this.props.history, ROUTE.WORKSPACES);

    return (
      <WorkspaceDetails
        ref={this.workspaceDetailsPageRef}
        workspacesLink={workspacesLink}
        onSave={(workspace: che.Workspace) => this.onSave(workspace)}
        history={this.props.history}
      />
    );
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
      if (this.workspaceDetailsPageRef.current?.state.activeTabKey === WorkspaceDetailsTab.Devfile) {
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
export default connector(WorkspaceDetailsContainer);
