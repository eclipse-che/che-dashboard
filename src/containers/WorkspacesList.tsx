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
import { AlertVariant } from '@patternfly/react-core';
import { inject, LazyServiceIdentifer } from 'inversify';

import { AppAlerts } from '../services/alerts/appAlerts';
import { AppState } from '../store';
import { selectAllWorkspaces, selectIsLoading, } from '../store/Workspaces/selectors';
import * as WorkspacesStore from '../store/Workspaces';
import Fallback from '../components/Fallback';
import WorkspacesList from '../pages/WorkspacesList';
import getRandomString from '../services/helpers/random';
import WorkspaceActionsProvider from './WorkspaceActions';
import { WorkspaceActionsConsumer } from './WorkspaceActions/context';

type Props =
  MappedProps
  & { history: History };

export class WorkspacesListContainer extends React.PureComponent<Props> {

  @inject(new LazyServiceIdentifer(() => AppAlerts))
  private appAlerts: AppAlerts;

  constructor(props: Props) {
    super(props);
  }

  public componentDidMount(): void {
    const { allWorkspaces } = this.props;
    if (!allWorkspaces || allWorkspaces.length === 0) {
      this.props.requestWorkspaces();
    }
  }

  private showAlert(message: string): void {
    this.appAlerts.showAlert({
      key: 'workspaces-list-' + getRandomString(4),
      title: message,
      variant: AlertVariant.warning,
    });
  }

  render() {
    const { branding, history, allWorkspaces, isLoading } = this.props;

    if (isLoading) {
      return Fallback;
    }

    return (
      <WorkspaceActionsProvider>
        <WorkspaceActionsConsumer>
          {context => (
            <WorkspacesList
              branding={branding.data}
              history={history}
              workspaces={allWorkspaces}
              onAction={(action, id) => context.handleAction(action, id)}
              showConfirmation={wantDelete => context.showConfirmation(wantDelete)}
              isDeleted={context.isDeleted}
            >
            </WorkspacesList>
          )}
        </WorkspaceActionsConsumer>
      </WorkspaceActionsProvider>
    );
  }

}

const mapStateToProps = (state: AppState) => {
  const { branding } = state;
  return {
    branding,
    allWorkspaces: selectAllWorkspaces(state),
    isLoading: selectIsLoading(state),
  };
};

const connector = connect(
  mapStateToProps,
  WorkspacesStore.actionCreators
);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(WorkspacesListContainer);
