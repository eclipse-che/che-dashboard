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

import { NavItem } from '@patternfly/react-core';
import React from 'react';

import { WorkspaceStatusIndicator } from '@/components/Workspace/Status/Indicator';
import { lazyInject } from '@/inversify.config';
import { NavigationRecentItemObject } from '@/Layout/Navigation';
import styles from '@/Layout/Navigation/index.module.css';
import getActivity from '@/Layout/Navigation/isActive';
import { RecentItemWorkspaceActions } from '@/Layout/Navigation/RecentItem/WorkspaceActions';
import { buildIdeLoaderLocation, toHref } from '@/services/helpers/location';
import { TabManager } from '@/services/tabManager';
import { Workspace, WorkspaceAdapter } from '@/services/workspace-adapter';

export type Props = {
  item: NavigationRecentItemObject;
  activePath: string;
};

type State = {
  isHovered: boolean;
  isFocused: boolean;
};

export class NavigationRecentItem extends React.PureComponent<Props, State> {
  @lazyInject(TabManager)
  private readonly tabManager: TabManager;

  constructor(props: Props) {
    super(props);
    this.state = { isHovered: false, isFocused: false };
  }

  private handleClick(workspace: Workspace) {
    const location = buildIdeLoaderLocation(workspace);
    const href = toHref(location);
    this.tabManager.open(href);
  }

  private handleKeyDown(event: React.KeyboardEvent, workspace: Workspace): void {
    if (event.key === 'Enter' || event.key === ' ') {
      // Ignore events bubbled up from child elements (e.g. the kebab button inside WorkspaceActions)
      if (event.target !== event.currentTarget) {
        return;
      }
      event.preventDefault();
      this.handleClick(workspace);
    }
  }

  private handleFocus(): void {
    this.setState({ isFocused: true });
  }

  private handleBlur(e: React.FocusEvent): void {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      this.setState({ isFocused: false });
    }
  }

  render(): React.ReactElement {
    const { activePath, item } = this.props;
    const { isHovered, isFocused } = this.state;

    const isActive = getActivity(item.to, activePath);
    const titleClassName = styles.titleHover + ' ' + (isActive ? styles.active : '');

    return (
      <NavItem
        id={item.to}
        data-testid={item.to}
        itemId={item.to}
        isActive={isActive}
        className={styles.navItem}
        preventDefault={true}
        tabIndex={0}
        onClick={() => this.handleClick(item.workspace)}
        onKeyDown={(e: React.KeyboardEvent) => this.handleKeyDown(e, item.workspace)}
        onMouseEnter={() => this.setState({ isHovered: true })}
        onMouseLeave={() => this.setState({ isHovered: false })}
        onFocus={() => this.handleFocus()}
        onBlur={(e: React.FocusEvent) => this.handleBlur(e)}
      >
        <span data-testid="recent-workspace-item">
          <WorkspaceStatusIndicator
            status={item.workspace.status}
            containerScc={WorkspaceAdapter.getContainerScc(item.workspace.ref)}
          />
          <span className={titleClassName}>{item.label}</span>
        </span>
        <RecentItemWorkspaceActions
          item={item}
          isParentHovered={isHovered}
          isParentFocused={isFocused}
        />
      </NavItem>
    );
  }
}
