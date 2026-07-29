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
import { connect, ConnectedProps } from 'react-redux';

import NavigationMainItem from '@/Layout/Navigation/MainItem';
import { getPluginNavigationItems } from '@/plugin-registry';
import { ROUTE } from '@/Routes';
import { RootState } from '@/store';
import { selectAllWorkspaces } from '@/store/Workspaces/selectors';

import { NavigationItemObject } from '.';

type Props = MappedProps & {
  activePath: string;
};

export class NavigationMainList extends React.PureComponent<Props> {
  private get items(): NavigationItemObject[] {
    const { allWorkspaces, state } = this.props;
    const allWorkspacesNumber = allWorkspaces.length;

    const base: NavigationItemObject[] = [
      { to: ROUTE.GET_STARTED, label: 'Create Workspace' },
      { to: ROUTE.WORKSPACES, label: `Workspaces (${allWorkspacesNumber})` },
    ];

    const pluginItems = getPluginNavigationItems();
    for (const def of pluginItems) {
      const label = def.labelSelector ? def.labelSelector(state) : def.label;
      const item: NavigationItemObject = { to: def.to, label };
      if (def.insertAfter) {
        const idx = base.findIndex(i => i.to === def.insertAfter);
        if (idx !== -1) {
          base.splice(idx + 1, 0, item);
          continue;
        }
      }
      base.push(item);
    }

    return base;
  }

  public render(): React.ReactElement {
    const { activePath } = this.props;

    const navItems = this.items.map(item => {
      return <NavigationMainItem key={item.to} item={item} activePath={activePath} />;
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
