/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { NavGroup, NavList } from '@patternfly/react-core';
import React from 'react';
import { useHistory } from 'react-router-dom';

import { NavigationRecentItem } from '@/Layout/Navigation/RecentItem';
import { ROUTE } from '@/Routes/routes';
import { Workspace } from '@/services/workspace-adapter';

import { NavigationRecentItemObject } from '.';

function buildRecentWorkspacesItems(
  activePath: string,
  workspaces: Array<Workspace>,
): Array<React.ReactElement> {
  return workspaces.map(workspace => {
    const workspaceName = workspace.name;
    const namespace = workspace.namespace;
    const navigateTo = ROUTE.IDE_LOADER.replace(':namespace', namespace).replace(
      ':workspaceName',
      workspaceName,
    );
    const item: NavigationRecentItemObject = {
      to: navigateTo,
      label: workspaceName,
      workspace,
    };
    const history = useHistory();
    return (
      <NavigationRecentItem key={item.to} history={history} item={item} activePath={activePath} />
    );
  });
}

function NavigationRecentList(props: {
  activePath: string;
  workspaces: Array<Workspace>;
}): React.ReactElement {
  const recentWorkspaceItems = buildRecentWorkspacesItems(props.activePath, props.workspaces);
  return (
    <NavList>
      <NavGroup title="RECENT WORKSPACES" style={{ marginTop: '25px' }}>
        {recentWorkspaceItems}
      </NavGroup>
    </NavList>
  );
}
NavigationRecentList.displayName = 'NavigationRecentListComponent';
export default NavigationRecentList;
