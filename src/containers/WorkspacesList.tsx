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
import { connect, ConnectedProps } from 'react-redux';
import { History } from 'history';

import { AppState } from '../store';
import * as WorkspacesStore from '../store/Workspaces';
import {
  selectIsLoading,
  selectAllWorkspaces,
} from '../store/Workspaces/selectors';
import WorkspacesListPage from '../pages/WorkspacesList';

type Props =
  MappedProps
  & { history: History };

export class WorkspacesList extends React.PureComponent<Props> {

  constructor(props: Props) {
    super(props);
  }

  public componentDidMount(): void {
    const { allWorkspaces } = this.props;
    if (!allWorkspaces || allWorkspaces.length === 0) {
      this.props.requestWorkspaces();
    }
  }

  render() {
    return (
      <WorkspacesListPage
        history={this.props.history}
      />
    );
  }

}

const mapStateToProps = (state: AppState) => ({
  isLoading: selectIsLoading(state),
  allWorkspaces: selectAllWorkspaces(state),
});

const connector = connect(
  mapStateToProps,
  WorkspacesStore.actionCreators
);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(WorkspacesList);
