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

import { Dropdown, DropdownItem, DropdownPosition, DropdownToggle } from '@patternfly/react-core';
import { CaretDownIcon } from '@patternfly/react-icons';
import { History } from 'history';
import React from 'react';

import { ActionContextType } from '@/contexts/WorkspaceActions';
import styles from '@/pages/WorkspaceDetails/Header/Actions/Dropdown/index.module.css';
import {
  DeprecatedWorkspaceStatus,
  DevWorkspaceStatus,
  WorkspaceAction,
  WorkspaceStatus,
} from '@/services/helpers/types';

type Props = {
  context: ActionContextType;
  history: History;
  status: WorkspaceStatus | DevWorkspaceStatus | DeprecatedWorkspaceStatus;
  workspaceUID: string;
  workspaceName: string;
  onAction: (action: WorkspaceAction, context: ActionContextType) => Promise<void>;
};

type State = {
  isExpanded: boolean;
};

export default class DropdownActions extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      isExpanded: false,
    };
  }

  private handleToggle(isExpanded: boolean): void {
    this.setState({ isExpanded });
  }

  private async handleSelect(action: WorkspaceAction): Promise<void> {
    const { context } = this.props;

    this.handleToggle(false);

    return this.props.onAction(action, context);
  }

  private getDropdownItems(): React.ReactNode[] {
    const { status } = this.props;
    const isWorkspaceStopped =
      status === WorkspaceStatus.STOPPED || status === DevWorkspaceStatus.STOPPED;

    return [
      <DropdownItem
        key={`action-${WorkspaceAction.OPEN_IDE}`}
        isDisabled={status === DevWorkspaceStatus.TERMINATING}
        onClick={async () => await this.handleSelect(WorkspaceAction.OPEN_IDE)}
      >
        <div>{WorkspaceAction.OPEN_IDE}</div>
      </DropdownItem>,
      <DropdownItem
        key={`action-${WorkspaceAction.START_DEBUG_AND_OPEN_LOGS}`}
        isDisabled={status === DevWorkspaceStatus.TERMINATING || !isWorkspaceStopped}
        onClick={async () => await this.handleSelect(WorkspaceAction.START_DEBUG_AND_OPEN_LOGS)}
      >
        <div>{WorkspaceAction.START_DEBUG_AND_OPEN_LOGS}</div>
      </DropdownItem>,
      <DropdownItem
        key={`action-${WorkspaceAction.START_IN_BACKGROUND}`}
        isDisabled={status === DevWorkspaceStatus.TERMINATING || !isWorkspaceStopped}
        onClick={async () => await this.handleSelect(WorkspaceAction.START_IN_BACKGROUND)}
      >
        <div>{WorkspaceAction.START_IN_BACKGROUND}</div>
      </DropdownItem>,
      <DropdownItem
        key={`action-${WorkspaceAction.RESTART_WORKSPACE}`}
        isDisabled={status === DevWorkspaceStatus.TERMINATING || isWorkspaceStopped}
        onClick={async () => await this.handleSelect(WorkspaceAction.RESTART_WORKSPACE)}
      >
        <div>{WorkspaceAction.RESTART_WORKSPACE}</div>
      </DropdownItem>,
      <DropdownItem
        key={`action-${WorkspaceAction.STOP_WORKSPACE}`}
        isDisabled={status === DevWorkspaceStatus.TERMINATING || isWorkspaceStopped}
        onClick={async () => await this.handleSelect(WorkspaceAction.STOP_WORKSPACE)}
      >
        <div>{WorkspaceAction.STOP_WORKSPACE}</div>
      </DropdownItem>,
      <DropdownItem
        key={`action-${WorkspaceAction.DELETE_WORKSPACE}`}
        isDisabled={
          status === DevWorkspaceStatus.TERMINATING ||
          status === WorkspaceStatus.STARTING ||
          status === WorkspaceStatus.STOPPING
        }
        onClick={async () => await this.handleSelect(WorkspaceAction.DELETE_WORKSPACE)}
      >
        <div>{WorkspaceAction.DELETE_WORKSPACE}</div>
      </DropdownItem>,
    ];
  }

  render(): React.ReactElement {
    const { workspaceUID } = this.props;
    const { isExpanded } = this.state;

    const dropdownItems = this.getDropdownItems();

    return (
      <Dropdown
        className={styles.workspaceActionSelector}
        toggle={
          <DropdownToggle
            data-testid={`${workspaceUID}-action-dropdown`}
            onToggle={isExpanded => this.handleToggle(isExpanded)}
            toggleIndicator={CaretDownIcon}
            isPrimary
          >
            Actions
          </DropdownToggle>
        }
        isOpen={isExpanded}
        position={DropdownPosition.right}
        dropdownItems={dropdownItems}
      />
    );
  }
}
