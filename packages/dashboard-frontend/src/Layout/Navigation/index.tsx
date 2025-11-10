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

import { Nav } from '@patternfly/react-core';
import { History, Location, UnregisterCallback } from 'history';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import NavigationMainList from '@/Layout/Navigation/MainList';
import NavigationRecentList from '@/Layout/Navigation/RecentList';
import { CREATE_NEW_IF_EXIST_SWITCH_ID } from '@/pages/GetStarted/SamplesList/Toolbar/CreateNewIfExistSwitch';
import { TEMPORARY_STORAGE_SWITCH_ID } from '@/pages/GetStarted/SamplesList/Toolbar/TemporaryStorageSwitch';
import { ROUTE } from '@/Routes';
import { buildGettingStartedLocation, buildWorkspacesLocation } from '@/services/helpers/location';
import { Workspace } from '@/services/workspace-adapter';
import { RootState } from '@/store';
import { selectAllWorkspaces, selectRecentWorkspaces } from '@/store/Workspaces/selectors';

export interface NavigationItemObject {
  to: string;
  label: string;
  icon?: React.ReactElement;
}
export interface NavigationRecentItemObject {
  to: string;
  label: string;
  workspace: Workspace;
}

type Props = MappedProps & {
  history: History;
};

type State = {
  activeLocation: Location;
};

export class Navigation extends React.PureComponent<Props, State> {
  private static createNew: { isChecked: boolean | undefined } = { isChecked: undefined };
  private static temporaryStorage: { isChecked: boolean | undefined } = { isChecked: undefined };
  private static pageStateCallbacks: {
    [CREATE_NEW_IF_EXIST_SWITCH_ID]: ((isChecked: boolean | undefined) => void)[];
    [TEMPORARY_STORAGE_SWITCH_ID]: ((isChecked: boolean | undefined) => void)[];
  } = {
    [CREATE_NEW_IF_EXIST_SWITCH_ID]: [],
    [TEMPORARY_STORAGE_SWITCH_ID]: [],
  };
  // Static page state to store the state of switches across the application
  public static pageState: {
    [CREATE_NEW_IF_EXIST_SWITCH_ID]: { isChecked: boolean | undefined };
    [TEMPORARY_STORAGE_SWITCH_ID]: { isChecked: boolean | undefined };
    subscribe: (callback: (isChecked: boolean | undefined) => void, id: string) => void;
    unsubscribe: (callback: (isChecked: boolean | undefined) => void, id: string) => void;
  } = Object.freeze({
    get [CREATE_NEW_IF_EXIST_SWITCH_ID](): { isChecked: boolean | undefined } {
      return Navigation.createNew;
    },
    set [CREATE_NEW_IF_EXIST_SWITCH_ID](value: { isChecked: boolean | undefined }) {
      Navigation.createNew = value;
      Navigation.pageStateCallbacks[CREATE_NEW_IF_EXIST_SWITCH_ID].forEach(callback => {
        callback(value.isChecked);
      });
    },
    get [TEMPORARY_STORAGE_SWITCH_ID](): { isChecked: boolean | undefined } {
      return Navigation.temporaryStorage;
    },
    set [TEMPORARY_STORAGE_SWITCH_ID](value: { isChecked: boolean | undefined }) {
      Navigation.temporaryStorage = value;
      Navigation.pageStateCallbacks[TEMPORARY_STORAGE_SWITCH_ID].forEach(callback =>
        callback(value.isChecked),
      );
    },
    subscribe: (callback: (isChecked: boolean | undefined) => void, id: string): void => {
      if (Navigation.pageStateCallbacks[id]) {
        Navigation.pageStateCallbacks[id].push(callback);
      }
    },
    unsubscribe: (callback: (isChecked: boolean | undefined) => void, id: string): void => {
      if (Navigation.pageStateCallbacks[id]) {
        Navigation.pageStateCallbacks[id] = Navigation.pageStateCallbacks[id].filter(
          (cb: (isChecked: boolean | undefined) => void) => cb !== callback,
        );
      }
    },
  });
  private readonly unregisterFn: UnregisterCallback;

  constructor(props: Props) {
    super(props);

    const activeLocation = this.props.history.location;
    let newLocation: Location | undefined;

    if (activeLocation.pathname === ROUTE.HOME) {
      const workspacesNumber = this.props.allWorkspaces.length;
      if (workspacesNumber === 0) {
        newLocation = buildGettingStartedLocation();
      } else {
        newLocation = buildWorkspacesLocation();
      }
    }
    if (newLocation) {
      this.props.history.replace(newLocation);
    }

    this.state = {
      activeLocation: newLocation || activeLocation,
    };

    this.unregisterFn = this.props.history.listen((location: Location) => {
      this.setActivePath(location.pathname);
    });
  }

  private handleNavSelect(selected: {
    groupId: string | number;
    itemId: string | number;
    to: string;
    event: React.FormEvent<HTMLInputElement>;
  }): void {
    const activeLocation = {
      pathname: selected.itemId,
    } as Location;
    this.setState({
      activeLocation,
    });
  }

  private setActivePath(path: string): void {
    const activeLocation = {
      pathname: path,
    } as Location;
    this.setState({
      activeLocation,
    });
  }

  public componentWillUnmount(): void {
    this.unregisterFn();
  }

  public render(): React.ReactElement {
    const { recentWorkspaces } = this.props;
    const { activeLocation } = this.state;

    return (
      <Nav aria-label="Navigation" onSelect={selected => this.handleNavSelect(selected)}>
        <NavigationMainList activePath={activeLocation.pathname} />
        <NavigationRecentList activePath={activeLocation.pathname} workspaces={recentWorkspaces} />
      </Nav>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  recentWorkspaces: selectRecentWorkspaces(state),
  allWorkspaces: selectAllWorkspaces(state),
});
const connector = connect(mapStateToProps);

type MappedProps = ConnectedProps<typeof connector>;

export default connector(Navigation);
