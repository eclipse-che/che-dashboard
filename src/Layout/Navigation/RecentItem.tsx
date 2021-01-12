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
import { Link } from 'react-router-dom';
import { NavItem } from '@patternfly/react-core';
import { NavigationRecentItemObject } from '.';
import WorkspaceIndicator from '../../components/Workspace/Indicator';

function NavigationRecentItem(props: { item: NavigationRecentItemObject, activePath: string }): React.ReactElement {
  const isActive = props.item.to === props.activePath;
  return (
    <NavItem
      itemId={props.item.to}
      isActive={isActive}
    >
      <Link to={props.item.to}>
        <span className="workspace-name">
          <WorkspaceIndicator status={props.item.status} />
          {props.item.label}
        </span>
      </Link>
    </NavItem>
  );
}
NavigationRecentItem.displayName = 'NavigationRecentItemComponent';
export default NavigationRecentItem;
