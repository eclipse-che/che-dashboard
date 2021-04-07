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
import { buildGettingStartedPath } from '../../services/helpers/location';
import { History } from 'history';

function buildCreateWorkspaceItem(): React.ReactElement {
  const createWorkspacePath = buildGettingStartedPath('custom-workspace');
  const item: NavigationItemObject = {
    to: createWorkspacePath,
    label: 'Create Workspace',
    icon: <PlusIcon className={styles.mainItemIcon} />,
  };
  return (
    <NavigationMainItem item={item}>
      {item.icon}
    </NavigationMainItem>
  );
}

function buildRecentWorkspacesItems(workspaces: Array<che.Workspace>, activePath: string, history: History): Array<React.ReactElement> {
  return workspaces.map(workspace => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const workspaceName = workspace.devfile.metadata.name!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const namespace = workspace.namespace!;
    const navigateTo = ROUTE.IDE_LOADER
      .replace(':namespace', namespace)
      .replace(':workspaceName', workspaceName);
    const item: NavigationRecentItemObject = {
      to: navigateTo,
      label: workspaceName,
      status: workspace.status,
      workspaceId: workspace.id
    };
    return <NavigationRecentItem key={item.to} item={item} activePath={activePath} history={history} />;
  });
}

function NavigationRecentList(props: { workspaces: Array<che.Workspace>, activePath: string, history: History }): React.ReactElement {
  const createWorkspaceItem = buildCreateWorkspaceItem();
  const recentWorkspaceItems = buildRecentWorkspacesItems(props.workspaces, props.activePath, props.history);
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
