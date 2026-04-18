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

import { helpers } from '@eclipse-che/common';
import {
  AlertVariant,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { ActionContextType } from '@/contexts/WorkspaceActions';
import styles from '@/contexts/WorkspaceActions/Dropdown/index.module.css';
import { lazyInject } from '@/inversify.config';
import { AppAlerts } from '@/services/alerts/appAlerts';
import getRandomString from '@/services/helpers/random';
import { DevWorkspaceStatus, WorkspaceAction, WorkspaceStatus } from '@/services/helpers/types';
import { Workspace } from '@/services/workspace-adapter';
import { RootState } from '@/store';

type OwnProps = {
  context: ActionContextType;
  isDisabled?: boolean;
  /** Controlled open state. When provided the component does not manage its own state. */
  isExpanded?: boolean;
  /** Called whenever the dropdown requests an open/close transition. */
  onToggle?: (isOpen: boolean) => void;
  toggle: 'kebab-toggle' | 'dropdown-toggle';
  workspace: Workspace;
  onAction?: (
    action: WorkspaceAction,
    workspaceUID: string,
    // true if the action succeeded, false if it failed, undefined if the action was not performed
    succeeded: boolean | undefined,
  ) => Promise<void>;
};

export type Props = OwnProps & MappedProps;

export type State = {
  isExpanded: boolean;
};

class WorkspaceActionsDropdownComponent extends React.PureComponent<Props, State> {
  @lazyInject(AppAlerts)
  private appAlerts: AppAlerts;

  constructor(props: Props) {
    super(props);

    this.state = {
      isExpanded: false,
    };
  }

  private get hasKebabToggle(): boolean {
    return this.props.toggle === 'kebab-toggle';
  }

  private buildToggle(): (toggleRef: React.Ref<MenuToggleElement>) => React.ReactElement {
    const { isDisabled = false, workspace } = this.props;

    if (this.hasKebabToggle) {
      // eslint-disable-next-line react/display-name
      return (toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle
          ref={toggleRef}
          aria-label="Actions"
          data-testid={`${workspace.uid}-action-dropdown`}
          data-testtype="kebab-toggle"
          isDisabled={isDisabled}
          onClick={() => this.handleToggle(!this.state.isExpanded)}
          isExpanded={this.state.isExpanded}
          variant="plain"
        >
          <EllipsisVIcon />
        </MenuToggle>
      );
    }

    // eslint-disable-next-line react/display-name
    return (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        aria-label="Actions"
        data-testid={`${workspace.uid}-action-dropdown`}
        data-testtype="dropdown-toggle"
        isDisabled={isDisabled}
        onClick={() => this.handleToggle(!this.state.isExpanded)}
        isExpanded={this.state.isExpanded}
        variant="primary"
      >
        Actions
      </MenuToggle>
    );
  }

  private handleToggle(isExpanded: boolean): void {
    if (this.props.onToggle !== undefined) {
      this.props.onToggle(isExpanded);
    } else {
      this.setState({ isExpanded });
    }
  }

  private async handleSelect(action: WorkspaceAction): Promise<void> {
    const { context, onAction, workspace } = this.props;

    this.handleToggle(false);

    let succeeded: boolean | undefined = undefined;
    try {
      if (action === WorkspaceAction.DELETE_WORKSPACE) {
        try {
          await context.showConfirmation([workspace.name]);
        } catch (e) {
          return onAction?.(action, workspace.uid, undefined);
        }
      }

      await context.handleAction(action, workspace.uid);
      succeeded = true;
    } catch (e) {
      const errorMessage = `Unable to ${action.toLocaleLowerCase()} ${
        workspace.name
      }. ${helpers.errors.getMessage(e)}`;
      this.showAlert(errorMessage);
      console.error(errorMessage);
      succeeded = false;
    }

    return onAction?.(action, workspace.uid, succeeded);
  }

  private showAlert(message: string): void {
    this.appAlerts.showAlert({
      key: 'workspace-dropdown-action-' + getRandomString(4),
      title: message,
      variant: AlertVariant.warning,
    });
  }

  private getDropdownItems(): React.ReactNode[] {
    const { workspace } = this.props;
    const isStopped =
      workspace.status === WorkspaceStatus.STOPPED ||
      workspace.status === DevWorkspaceStatus.STOPPED ||
      workspace.status === DevWorkspaceStatus.FAILED;
    const isTerminating = workspace.status === DevWorkspaceStatus.TERMINATING;

    const getItem = (action: WorkspaceAction, isDisabled: boolean) => {
      return (
        <DropdownItem
          aria-label={`Action: ${action}`}
          key={`action-${action}`}
          isDisabled={isDisabled}
          onClick={async e => {
            e.preventDefault();
            e.stopPropagation();

            return this.handleSelect(action);
          }}
        >
          {action}
        </DropdownItem>
      );
    };

    // Note: SCC mismatch does NOT disable actions - only shows warning when starting
    const items = [
      getItem(WorkspaceAction.OPEN_IDE, isTerminating),
      getItem(WorkspaceAction.START_DEBUG_AND_OPEN_LOGS, isTerminating || !isStopped),
      getItem(WorkspaceAction.START_IN_BACKGROUND, isTerminating || !isStopped),
      getItem(WorkspaceAction.RESTART_WORKSPACE, isTerminating || isStopped),
      getItem(WorkspaceAction.STOP_WORKSPACE, isTerminating || isStopped),
      getItem(WorkspaceAction.DELETE_WORKSPACE, isTerminating),
      getItem(WorkspaceAction.REFRESH_KUBECONFIG, isTerminating || isStopped),
    ];

    // The 'Workspace Details' action is available only with kebab-toggle because this actions widget is used on the workspace details page without kebab-toggle
    if (this.hasKebabToggle) {
      items.push(getItem(WorkspaceAction.WORKSPACE_DETAILS, false));
    }

    return items;
  }

  render(): React.ReactElement {
    // Use controlled isExpanded when provided, otherwise fall back to internal state.
    const isExpanded =
      this.props.isExpanded !== undefined ? this.props.isExpanded : this.state.isExpanded;

    const dropdownToggle = this.buildToggle();
    const dropdownItems = this.getDropdownItems();

    return (
      <Dropdown
        className={styles.workspaceActionSelector}
        isOpen={isExpanded}
        onSelect={() => this.handleToggle(false)}
        onOpenChange={isOpen => this.handleToggle(isOpen)}
        toggle={dropdownToggle}
        popperProps={{
          appendTo: () => document.body,
          position: 'right',
        }}
      >
        <DropdownList>{dropdownItems}</DropdownList>
      </Dropdown>
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mapStateToProps = (_state: RootState) => ({});

const connector = connect(mapStateToProps);

type MappedProps = ConnectedProps<typeof connector>;
export const WorkspaceActionsDropdown = connector(WorkspaceActionsDropdownComponent);

// Export unconnected component for testing
export { WorkspaceActionsDropdownComponent };
