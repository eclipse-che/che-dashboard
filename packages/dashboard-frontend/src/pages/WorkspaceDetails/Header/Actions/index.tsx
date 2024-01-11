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

import common from '@eclipse-che/common';
import { AlertVariant } from '@patternfly/react-core';
import { History } from 'history';
import React from 'react';

import { ActionContextType, WorkspaceActionsConsumer } from '@/contexts/WorkspaceActions';
import WorkspaceActionsProvider from '@/contexts/WorkspaceActions/Provider';
import { lazyInject } from '@/inversify.config';
import ButtonAction from '@/pages/WorkspaceDetails/Header/Actions/Button';
import DropdownActions from '@/pages/WorkspaceDetails/Header/Actions/Dropdown';
import { AppAlerts } from '@/services/alerts/appAlerts';
import getRandomString from '@/services/helpers/random';
import {
  DeprecatedWorkspaceStatus,
  DevWorkspaceStatus,
  WorkspaceAction,
  WorkspaceStatus,
} from '@/services/helpers/types';

type Props = {
  workspaceUID: string;
  workspaceName: string;
  status: WorkspaceStatus | DevWorkspaceStatus | DeprecatedWorkspaceStatus;
  history: History;
};

export class HeaderActionSelect extends React.PureComponent<Props> {
  @lazyInject(AppAlerts)
  private appAlerts: AppAlerts;

  constructor(props: Props) {
    super(props);
  }

  private async handleSelectedAction(
    selectedAction: WorkspaceAction,
    context: ActionContextType,
  ): Promise<void> {
    try {
      if (selectedAction === WorkspaceAction.DELETE_WORKSPACE) {
        try {
          await context.showConfirmation([this.props.workspaceName]);
        } catch (e) {
          return;
        }
      }
      const nextPath = await context.handleAction(selectedAction, this.props.workspaceUID);
      if (!nextPath) {
        return;
      }
      this.props.history.push(nextPath);
    } catch (e) {
      const errorMessage = common.helpers.errors.getMessage(e);
      this.showAlert(errorMessage);
      console.warn(errorMessage);
    }
  }

  private showAlert(message: string): void {
    this.appAlerts.showAlert({
      key: 'workspace-details-' + getRandomString(4),
      title: message,
      variant: AlertVariant.warning,
    });
  }

  render(): React.ReactNode {
    const { history, status } = this.props;

    return (
      <WorkspaceActionsProvider history={history}>
        <WorkspaceActionsConsumer>
          {context => {
            if (status === 'Deprecated') {
              return (
                <ButtonAction
                  context={context}
                  onAction={(action, context) => this.handleSelectedAction(action, context)}
                />
              );
            }
            const { ...props } = this.props;
            return (
              <DropdownActions
                {...props}
                context={context}
                onAction={(action, context) => this.handleSelectedAction(action, context)}
              />
            );
          }}
        </WorkspaceActionsConsumer>
      </WorkspaceActionsProvider>
    );
  }
}
