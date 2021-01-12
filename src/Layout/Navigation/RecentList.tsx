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
import {
  NavGroup,
  NavList,
} from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';

import NavigationRecentItem from './RecentItem';
import { NavigationItemObject, NavigationRecentItemObject } from '.';
import NavigationMainItem from './MainItem';
import { ROUTE } from '../../route.enum';

import styles from './index.module.css';

function buildCreateWorkspaceItem(): React.ReactElement {
  const item: NavigationItemObject = {
    to: ROUTE.TAB_CUSTOM_WORKSPACE,
    label: 'Create Workspace',
    icon: <PlusIcon className={styles.mainItemIcon} />,
  };
  return (
    <NavigationMainItem item={item}>
      {item.icon}
    </NavigationMainItem>
  );
}

function buildRecentWorkspacesItems(workspaces: Array<che.Workspace>, activePath: string): Array<React.ReactElement> {
  return workspaces.map(workspace => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const workspaceName = workspace.devfile.metadata.name!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const namespace = workspace.namespace!;
    const navigateTo = ROUTE.IDE
      .replace(':namespace', namespace)
      .replace(':workspaceName', workspaceName);
    const item: NavigationRecentItemObject = {
      to: navigateTo,
      label: workspaceName,
      status: workspace.status,
    };
    return <NavigationRecentItem key={item.to} item={item} activePath={activePath} />;
  });
}

function NavigationRecentList(props: { workspaces: Array<che.Workspace>, activePath: string }): React.ReactElement {
  const createWorkspaceItem = buildCreateWorkspaceItem();
  const recentWorkspaceItems = buildRecentWorkspacesItems(props.workspaces, props.activePath);
  return (
    <NavList>
      <NavGroup title="RECENT WORKSPACES">
        {createWorkspaceItem}
        {recentWorkspaceItems}
      </NavGroup>
    </NavList>
  );
}
NavigationRecentList.displayName = 'NavigationRecentListComponent';
export default NavigationRecentList;
