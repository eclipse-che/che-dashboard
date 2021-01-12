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

import { NavigationItemObject } from '.';

import styles from './index.module.css';

function NavigationMainItem(props: { item: NavigationItemObject, children: React.ReactNode, activePath?: string }): React.ReactElement {
  const isActive = props.item.to === props.activePath;

  return (
    <NavItem
      itemId={props.item.to}
      isActive={isActive}
    >
      <Link
        to={props.item.to}
        className={styles.mainItem}
      >
        {props.children}
        {props.item.label}
      </Link>
    </NavItem>
  );
}
NavigationMainItem.displayName = 'NavigationMainItemComponent';
export default NavigationMainItem;
