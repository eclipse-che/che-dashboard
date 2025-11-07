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

import { Dropdown, DropdownItem, DropdownToggle } from '@patternfly/react-core';
import { createHash } from 'crypto';
import React from 'react';

import styles from '@/components/WorkspaceProgress/Alert/ActionGroupSelector/index.module.css';
import { ActionCallback, ActionGroup } from '@/services/helpers/types';

export type Props = {
  actionGroup: ActionGroup;
};
export type State = {
  isOpen: boolean;
};

export class ActionGroupSelector extends React.PureComponent<Props, State> {
  private readonly key: string;

  constructor(props: Props) {
    super(props);

    this.state = {
      isOpen: false,
    };

    this.key = createHash('MD5')
      .update(props.actionGroup.title)
      .digest('hex')
      .substring(0, 20)
      .toLowerCase();
  }

  private onToggle(isOpen: boolean): void {
    this.setState({ isOpen });
  }

  private onSelect(): void {
    this.setState({
      isOpen: false,
    });
  }

  private buildDropdownItems(): React.ReactElement[] {
    const actionGroup = this.props.actionGroup;

    return actionGroup.actionCallbacks.map((action: ActionCallback, index: number) => (
      <DropdownItem key={`${this.key}-${index}`} onClick={() => action.callback()}>
        {action.title}
      </DropdownItem>
    ));
  }

  public render(): React.ReactElement {
    const { actionGroup } = this.props;
    const { isOpen } = this.state;

    const dropdownItems = this.buildDropdownItems();

    return (
      <Dropdown
        className={styles.dropdown}
        onSelect={() => this.onSelect()}
        toggle={
          <DropdownToggle
            id={`dropdown-toggle-${this.key}`}
            onToggle={isOpen => this.onToggle(isOpen)}
          >
            {actionGroup.title}
          </DropdownToggle>
        }
        isOpen={isOpen}
        dropdownItems={dropdownItems}
      />
    );
  }
}
