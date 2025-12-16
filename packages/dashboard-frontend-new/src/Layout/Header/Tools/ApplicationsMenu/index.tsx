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

import { ApplicationInfo } from '@eclipse-che/common';
import {
  Dropdown,
  DropdownGroup,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { ThIcon } from '@patternfly/react-icons';
import React from 'react';

type Props = {
  applications: ApplicationInfo[];
};
type State = {
  isOpen: boolean;
};

export class ApplicationsMenu extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      isOpen: false,
    };
  }

  private onToggle(): void {
    this.setState({
      isOpen: !this.state.isOpen,
    });
  }

  private buildMenuItems(): React.ReactElement[] {
    const apps = this.props.applications;
    const defaultAppsGroup = 'Applications';
    const itemsByGroup: { [groupName: string]: React.ReactElement[] } = {
      [defaultAppsGroup]: [],
    };
    apps.forEach(app => {
      if (!app) {
        return;
      }

      const group = app.group || defaultAppsGroup;
      if (itemsByGroup[group] === undefined) {
        itemsByGroup[group] = [];
      }

      const item = (
        <DropdownItem key={app.url} icon={<img src={app.icon} />} to={app.url} target="_blank">
          {app.title}
        </DropdownItem>
      );

      itemsByGroup[group].push(item);
    });

    const groupedItems: React.ReactElement[] = [];
    Object.keys(itemsByGroup).forEach(group => {
      const items = itemsByGroup[group];
      if (items.length === 0) {
        return;
      }
      const groupItem = (
        <DropdownGroup key={group} label={group}>
          {items}
        </DropdownGroup>
      );
      groupedItems.push(groupItem);
    });

    return groupedItems;
  }

  render(): React.ReactElement {
    const groupedItems = this.buildMenuItems();

    return (
      <Dropdown
        aria-label="External Applications"
        isOpen={this.state.isOpen}
        onSelect={() => this.setState({ isOpen: false })}
        onOpenChange={isOpen => this.setState({ isOpen })}
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            onClick={() => this.onToggle()}
            isExpanded={this.state.isOpen}
            variant="plain"
            aria-label="External Applications"
          >
            <ThIcon />
          </MenuToggle>
        )}
      >
        <DropdownList>{groupedItems}</DropdownList>
      </Dropdown>
    );
  }
}
