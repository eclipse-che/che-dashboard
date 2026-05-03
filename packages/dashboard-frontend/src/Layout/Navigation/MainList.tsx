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

import { NavList } from '@patternfly/react-core';
import React from 'react';

import { getPluginNavigationItems } from '@/plugin-registry';
import { connect, ConnectedProps } from 'react-redux';

import NavigationMainItem from '@/Layout/Navigation/MainItem';
import { ROUTE } from '@/Routes';
import { RootState } from '@/store';
import { selectAllWorkspaces } from '@/store/Workspaces/selectors';

import { NavigationItemObject } from '.';

type Props = MappedProps & {
  activePath: string;
};

function insertPluginItems(
  base: NavigationItemObject[],
  pluginItems: Array<{ to: string; label: string; labelSelector?: (state: unknown) => string; insertAfter?: string }>,
  state: unknown,
): NavigationItemObject[] {
  const result = [...base];
  for (const item of pluginItems) {
    const label = item.labelSelector ? item.labelSelector(state) : item.label;
    const insertIdx = item.insertAfter
      ? result.findIndex(i => i.to === item.insertAfter)
      : -1;
    const pos = insertIdx >= 0 ? insertIdx + 1 : result.length;
    result.splice(pos, 0, { to: item.to, label });
  }
  return result;
}

export class NavigationMainList extends React.PureComponent<Props> {
  private get items(): NavigationItemObject[] {
    const { allWorkspaces, state } = this.props;
    const allWorkspacesNumber = allWorkspaces.length;

    const base: NavigationItemObject[] = [
      { to: ROUTE.GET_STARTED, label: 'Create Workspace' },
      { to: ROUTE.WORKSPACES, label: `Workspaces (${allWorkspacesNumber})` },
    ];

    return insertPluginItems(base, getPluginNavigationItems(), state);
  }

  public render(): React.ReactElement {
    const { activePath } = this.props;

    const navItems = this.items.map(item => {
      return <NavigationMainItem key={item.label} item={item} activePath={activePath} />;
    });

    return <NavList>{navItems}</NavList>;
  }
}

const mapStateToProps = (state: RootState) => ({
  allWorkspaces: selectAllWorkspaces(state),
  state,
});

const connector = connect(mapStateToProps);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(NavigationMainList);
