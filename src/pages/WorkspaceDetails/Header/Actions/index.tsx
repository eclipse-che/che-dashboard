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

import { Dropdown, DropdownItem, DropdownToggle } from '@patternfly/react-core';
import { CaretDownIcon } from '@patternfly/react-icons';
import React from 'react';
import WorkspaceDeleteAction, { WorkspaceDeleteAction as DeleteAction } from '../../../../components/Workspace/DeleteAction';
import { Actions } from '../../../../containers/WorkspaceDetails';
import { WorkspaceStatus } from '../../../../services/helpers/types';

import './Actions.styl';

type Props = {
  workspaceId: string;
  workspaceName: string;
  status: string | undefined;
  onAction: (action: Actions) => void;
};

type State = {
  isExpanded: boolean;
  isModalOpen: boolean;
}

export class HeaderActionSelect extends React.PureComponent<Props, State> {
  private readonly workspaceDeleteRef: React.RefObject<DeleteAction>;

  constructor(props: Props) {
    super(props);

    this.state = {
      isExpanded: false,
      isModalOpen: false,
    };

    this.workspaceDeleteRef = React.createRef<DeleteAction>();
  }

  private handleToggle(isExpanded: boolean): void {
    if (this.state.isModalOpen) {
      return;
    }
    this.setState({ isExpanded });
  }

  private handleSelect(selected: Actions): void {
    this.setState({
      isExpanded: false,
    });
    this.props.onAction(selected);
  }

  private onDelete(): void {
    this.handleSelect(Actions.DELETE_WORKSPACE);
    this.setState({ isExpanded: true });
    this.workspaceDeleteRef.current?.onClick();
  }

  private onModalStatusChange(isModalOpen: boolean): void {
    this.setState({ isModalOpen });
    if (!isModalOpen && this.state.isExpanded) {
      this.setState({ isExpanded: false });
    }
  }

  private getDropdownItems(): React.ReactNode[] {
    const { workspaceId, status, workspaceName } = this.props;

    return [
      (<DropdownItem
        key={`action-${Actions.OPEN}`}
        onClick={() => this.handleSelect(Actions.OPEN)}>
        <div>{Actions.OPEN}</div>
      </DropdownItem>),
      (<DropdownItem
        key={`action-${Actions.OPEN_IN_VERBOSE_MODE}`}
        onClick={() => this.handleSelect(Actions.OPEN_IN_VERBOSE_MODE)}>
        <div>{Actions.OPEN_IN_VERBOSE_MODE}</div>
      </DropdownItem>),
      (<DropdownItem
        key={`action-${Actions.START_IN_BACKGROUND}`}
        isDisabled={status !== WorkspaceStatus[WorkspaceStatus.STOPPED]}
        onClick={() => this.handleSelect(Actions.START_IN_BACKGROUND)}>
        <div>{Actions.START_IN_BACKGROUND}</div>
      </DropdownItem>),
      (<DropdownItem
        key={`action-${Actions.STOP_WORKSPACE}`}
        isDisabled={status === WorkspaceStatus[WorkspaceStatus.STOPPED]}
        onClick={() => this.handleSelect(Actions.STOP_WORKSPACE)}>
        <div>{Actions.STOP_WORKSPACE}</div>
      </DropdownItem>),
      (<DropdownItem
        key={`action-${Actions.DELETE_WORKSPACE}`}
        isDisabled={status === WorkspaceStatus[WorkspaceStatus.STARTING] || status === WorkspaceStatus[WorkspaceStatus.STOPPING]}
        onClick={() => this.onDelete()}>
        <WorkspaceDeleteAction
          workspaceName={workspaceName}
          workspaceId={workspaceId}
          ref={this.workspaceDeleteRef}
          onModalStatusChange={isModalOpen => this.onModalStatusChange(isModalOpen)}
          status={status ? WorkspaceStatus[status] : WorkspaceStatus.STOPPED}>
          {Actions.DELETE_WORKSPACE}
        </WorkspaceDeleteAction>
      </DropdownItem>),
    ];
  }

  render(): React.ReactNode {
    const { workspaceId } = this.props;
    const { isExpanded } = this.state;

    return (
      <Dropdown
        className="workspace-action-selector"
        toggle={(
          <DropdownToggle
            data-testid={`${workspaceId}-action-dropdown`}
            onToggle={isExpanded => this.handleToggle(isExpanded)}
            toggleIndicator={CaretDownIcon}
            isPrimary>
            Actions
          </DropdownToggle>
        )}
        isOpen={isExpanded}
        position="right"
        dropdownItems={this.getDropdownItems()}
      />
    );
  }
}
