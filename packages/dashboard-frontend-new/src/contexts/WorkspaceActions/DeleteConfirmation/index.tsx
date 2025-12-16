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

import {
  Button,
  ButtonVariant,
  Checkbox,
  Content,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';
import React from 'react';

import { WantDelete } from '@/contexts/WorkspaceActions';

export type Props = {
  isOpen: boolean;
  wantDelete: WantDelete;
  onConfirm: () => void;
  onClose: () => void;
};
export type State = {
  isConfirmed: boolean;
};

export class WorkspaceActionsDeleteConfirmation extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      isConfirmed: false,
    };
  }

  private handleConfirmationChange(isConfirmed: boolean): void {
    this.setState({ isConfirmed });
  }

  private handleConfirm(): void {
    this.handleConfirmationChange(false);
    this.props.onConfirm();
    this.props.onClose();
  }

  private handleClose(): void {
    this.handleConfirmationChange(false);
    this.props.onClose();
  }

  public render(): React.ReactElement {
    const { isOpen, wantDelete } = this.props;
    const { isConfirmed } = this.state;

    let confirmationText: string;
    if (wantDelete.length === 1) {
      const workspaceName = wantDelete[0];
      confirmationText = `Would you like to delete workspace "${workspaceName}"?`;
    } else {
      confirmationText = `Would you like to delete ${wantDelete.length} workspaces?`;
    }

    return (
      <Modal
        aria-label="Delete workspaces confirmation window"
        isOpen={isOpen}
        variant={ModalVariant.small}
        onClose={() => this.handleClose()}
      >
        <ModalHeader title="Delete Workspace" titleIconVariant="warning" />
        <ModalBody>
          <Content>
            <Content component="p">{confirmationText}</Content>
            <Checkbox
              style={{ margin: '0 0 0 0.4rem' }}
              data-testid="confirmation-checkbox"
              isChecked={isConfirmed}
              onChange={(_event, checked) => this.handleConfirmationChange(checked)}
              id="confirmation-checkbox"
              label="I understand, this operation cannot be reverted."
            />
          </Content>
        </ModalBody>
        <ModalFooter>
          <Button
            variant={ButtonVariant.danger}
            isDisabled={isConfirmed === false}
            data-testid="delete-workspace-button"
            onClick={() => this.handleConfirm()}
          >
            Delete
          </Button>
          <Button
            variant={ButtonVariant.link}
            data-testid="close-button"
            onClick={() => this.handleClose()}
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}
