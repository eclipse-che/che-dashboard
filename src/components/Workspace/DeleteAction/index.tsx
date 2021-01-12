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

import {
  AlertVariant,
  Button,
  ButtonVariant,
  Checkbox,
  Modal,
  ModalVariant,
  Text,
  TextContent,
} from '@patternfly/react-core';
import getDefaultDeleteButton from './defaultDeleteButton';
import ExclamationTriangleIcon from '@patternfly/react-icons/dist/js/icons/exclamation-triangle-icon';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { container } from '../../../inversify.config';
import { AppAlerts } from '../../../services/alerts/appAlerts';
import { Debounce } from '../../../services/helpers/debounce';
import { WorkspaceStatus } from '../../../services/helpers/types';
import * as WorkspaceStore from '../../../store/Workspaces';

import * as styles from '../action.module.css';

type Props = MappedProps
  & {
    workspaceId: string;
    status: WorkspaceStatus;
    workspaceName?: string;
    disabled?: boolean;
    children?: React.ReactNode;
    onModalStatusChange?: (isOpen: boolean) => void;
  };

type State = {
  isDebounceDelay: boolean;
  workspaceStatus?: string;
  isInfoOpen?: boolean;
  warningInfoCheck?: boolean;
};

export class WorkspaceDeleteAction extends React.PureComponent<Props, State> {
  static shouldDelete: string[] = [];

  private readonly debounce: Debounce;
  private readonly appAlerts: AppAlerts;

  constructor(props: Props) {
    super(props);

    this.state = {
      isDebounceDelay: false,
    };

    this.appAlerts = container.get(AppAlerts);

    this.debounce = container.get(Debounce);
    this.debounce.subscribe(isDebounceDelay => {
      this.setState({ isDebounceDelay });
    });
  }

  private showAlert(message: string, alertVariant?: AlertVariant): void {
    const variant = alertVariant ? alertVariant : AlertVariant.danger;
    this.appAlerts.showAlert({
      key: `wrks-delete-${this.props.workspaceId}-${AlertVariant[variant]}`,
      title: message,
      variant,
    });
  }

  private async checkDelayedActions(): Promise<void> {
    const index = WorkspaceDeleteAction.shouldDelete.indexOf(this.props.workspaceId);
    if (index > -1 && this.props.status === WorkspaceStatus.STOPPED) {
      WorkspaceDeleteAction.shouldDelete.splice(index, 1);
      try {
        await this.props.deleteWorkspace(this.props.workspaceId);
        this.showAlert('Workspace successfully deleted.', AlertVariant.success);
      } catch (e) {
        this.showAlert(`Unable to delete the workspace. ${e}`);
        return;
      }
    }
  }

  public async componentDidMount(): Promise<void> {
    await this.checkDelayedActions();
  }

  public async componentDidUpdate(): Promise<void> {
    await this.checkDelayedActions();
  }

  // This method is called when the component is removed from the document
  public componentWillUnmount(): void {
    this.debounce.unsubscribeAll();
  }

  public onClick(): void {
    this.setInfoModalStatus(true);
  }

  private async onDelete(): Promise<void> {

    if (this.props.disabled
      || this.state.isDebounceDelay
      || WorkspaceDeleteAction.shouldDelete.includes(this.props.workspaceId)) {
      return;
    }

    this.debounce.setDelay();
    if (this.props.status !== WorkspaceStatus.STOPPED) {
      if (!WorkspaceDeleteAction.shouldDelete.includes(this.props.workspaceId)) {
        WorkspaceDeleteAction.shouldDelete.push(this.props.workspaceId);
      }
      try {
        await this.props.stopWorkspace(this.props.workspaceId);
      } catch (e) {
        this.showAlert(`Unable to stop the workspace. ${e}`);
        return;
      }
      return;
    }

    try {
      await this.props.deleteWorkspace(this.props.workspaceId);
      this.showAlert('Workspace successfully deleted.', AlertVariant.success);
    } catch (e) {
      this.showAlert(`Unable to delete the workspace. ${e}`);
    }
  }

  private setInfoModalStatus(isInfoOpen: boolean): void {
    if (this.state.isInfoOpen === isInfoOpen) {
      return;
    }
    if (!isInfoOpen) {
      this.setState({ warningInfoCheck: false });
    }
    this.setState({ isInfoOpen });
    if (this.props.onModalStatusChange) {
      this.props.onModalStatusChange(isInfoOpen);
    }
  }

  private getInfoModalContent(): React.ReactNode {
    const { workspaceId, workspaceName } = this.props;
    const text = `Would you like to delete workspace '${workspaceName ? workspaceName : workspaceId}'?`;

    return (
      <TextContent>
        <Text>{text}</Text>
        <Checkbox
          style={{ margin: '0 0 0 0.4rem' }}
          data-testid="warning-info-checkbox"
          isChecked={this.state.warningInfoCheck}
          onChange={() => {
            this.setState({ warningInfoCheck: !this.state.warningInfoCheck });
          }}
          id="delete-warning-info-check"
          label="I understand, this operation cannot be reverted."
        />
      </TextContent>);
  }

  private get defaultChildren(): React.ReactNode {
    const { workspaceId, disabled } = this.props;
    const { isDebounceDelay } = this.state;
    const shouldDelete = WorkspaceDeleteAction.shouldDelete.includes(workspaceId);
    const className = disabled || isDebounceDelay || shouldDelete ? styles.disabledWorkspaceStatus : styles.workspaceStatus;

    return getDefaultDeleteButton(className);
  }

  private getInfoModal(): React.ReactNode {
    const { isInfoOpen, warningInfoCheck } = this.state;

    return (
      <Modal
        header={(
          <span className={styles.infoModalHeader}>
            <ExclamationTriangleIcon />Delete Workspace
          </span>)}
        variant={ModalVariant.small}
        isOpen={isInfoOpen}
        onClose={() => this.setInfoModalStatus(false)}
        aria-label="warning-info"
        footer={(
          <React.Fragment>
            <Button variant={ButtonVariant.danger} isDisabled={!warningInfoCheck}
              data-testid="delete-button" onClick={() => this.onDelete()}>
              Delete
            </Button>
            <Button variant={ButtonVariant.link} data-testid="cancel-button"
              onClick={() => this.setInfoModalStatus(false)}>
              Cancel
            </Button>
          </React.Fragment>)}
      >
        {this.getInfoModalContent()}
      </Modal>
    );
  }

  public render(): React.ReactElement {
    const children = this.props.children ? this.props.children : this.defaultChildren;
    const { workspaceId } = this.props;

    return (
      <span
        data-testid={`delete-${workspaceId}`}
        key={`wrks-delete-${workspaceId}`}
        onClick={e => {
          e.stopPropagation();
          this.onClick();
        }}>
        {this.getInfoModal()}
        {children}
      </span>
    );
  }

}

const mapStateToProps = () => ({});

const connector = connect(
  mapStateToProps,
  WorkspaceStore.actionCreators,
  null,
  { forwardRef: true },
);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(WorkspaceDeleteAction);
