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
import { NavList } from '@patternfly/react-core';
import {
  CubesIcon,
  PlusIcon,
} from '@patternfly/react-icons';

import NavigationMainItem from './MainItem';
import { NavigationItemObject } from '.';
import { ROUTE } from '../../route.enum';

import styles from './index.module.css';

const items: NavigationItemObject[] = [
  { to: ROUTE.GET_STARTED, label: 'Get Started Page', icon: <PlusIcon className={styles.mainItemIcon} /> },
  { to: ROUTE.WORKSPACES, label: 'Workspaces', icon: <CubesIcon className={styles.mainItemIcon} /> },
];

function NavigationMainList(props: { activePath: string }): React.ReactElement {
  const navItems = items.map(item => {
    return (
      <NavigationMainItem
        key={item.label}
        item={item}
        activePath={props.activePath}
      >
        {item.icon}
      </NavigationMainItem>
    );
  });
  return (
    <NavList>
      {navItems}
    </NavList>
  );
}
NavigationMainList.displayName = 'NavigationMainListComponent';
export default NavigationMainList;
