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
import { History, Location, UnregisterCallback } from 'history';
import { Nav } from '@patternfly/react-core';

import { ThemeVariant } from '../themeVariant';
import { AppState } from '../../store';
import NavigationMainList from './MainList';
import NavigationRecentList from './RecentList';
import * as WorkspacesStore from '../../store/Workspaces';
import { selectAllWorkspaces, selectRecentWorkspaces } from '../../store/Workspaces/selectors';
import { ROUTE } from '../../route.enum';
import { buildGettingStartedPath, buildWorkspacesPath } from '../../services/helpers/location';

export interface NavigationItemObject {
  to: string,
  label: string,
  icon: React.ReactElement;
}
export interface NavigationRecentItemObject {
  to: string,
  label: string,
  status: string;
}

type Props =
  MappedProps
  & {
    history: History;
    theme: ThemeVariant;
  };

type State = {
  activePath: string;
};

export class Navigation extends React.PureComponent<Props, State> {

  private readonly unregisterFn: UnregisterCallback;

  constructor(props: Props) {
    super(props);

    let activePath = this.props.history.location.pathname.split('&')[0];
    if (activePath === ROUTE.HOME) {
      const workspacesNumber = this.props.allWorkspaces.length;
      if (workspacesNumber === 0) {
        activePath = buildGettingStartedPath('get-started');
      } else {
        activePath = buildWorkspacesPath();
      }
    }
    if (this.props.history.location.pathname !== activePath) {
      this.props.history.replace(activePath);
    }

    this.state = {
      activePath,
    };

    this.unregisterFn = this.props.history.listen((location: Location) => {
      this.setActivePath(location.pathname);
    });
  }

  private handleNavSelect(selected: {
    groupId: React.ReactText;
    itemId: React.ReactText;
    to: string;
    event: React.FormEvent<HTMLInputElement>;
  }): void {
    this.setState({ activePath: selected.itemId as string });
  }

  private setActivePath(path: string): void {
    this.setState({ activePath: path });
  }

  public componentWillUnmount(): void {
    this.unregisterFn();
  }

  public render(): React.ReactElement {
    const { theme, recentWorkspaces } = this.props;
    const { activePath } = this.state;

    const recent = recentWorkspaces || [];

    return (
      <Nav
        aria-label='Navigation'
        onSelect={selected => this.handleNavSelect(selected)}
        theme={theme}
      >
        <NavigationMainList activePath={activePath} />
        <NavigationRecentList workspaces={recent} activePath={activePath} />
      </Nav>
    );
  }

}

const mapStateToProps = (state: AppState) => ({
  recentWorkspaces: selectRecentWorkspaces(state),
  allWorkspaces: selectAllWorkspaces(state),
});
const connector = connect(
  mapStateToProps,
  WorkspacesStore.actionCreators,
);

type MappedProps = ConnectedProps<typeof connector>;

export default connector(Navigation);
