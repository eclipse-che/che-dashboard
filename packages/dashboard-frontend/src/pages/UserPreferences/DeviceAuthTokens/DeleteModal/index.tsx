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

import { api } from '@eclipse-che/common';
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

export type Props = {
  isOpen: boolean;
  tokens: api.DeviceAuthToken[];
  onCloseModal: () => void;
  onDelete: (tokens: api.DeviceAuthToken[]) => void;
};

export type State = {
  isChecked: boolean;
};

export class DeviceAuthTokensDeleteModal extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { isChecked: false };
  }

  private handleDelete(): void {
    const { tokens } = this.props;
    if (tokens.length > 0) {
      this.setState({ isChecked: false });
      this.props.onDelete(tokens);
    }
  }

  private handleCloseModal(): void {
    this.setState({ isChecked: false });
    this.props.onCloseModal();
  }

  public render(): React.ReactElement {
    const { isOpen, tokens } = this.props;
    const { isChecked } = this.state;

    const count = tokens.length;
    const modalTitle =
      count === 1
        ? 'Delete Device Authentication Token'
        : `Delete ${count} Device Authentication Tokens`;

    const bodyText =
      count === 1 ? (
        <Content component="p">
          Are you sure you want to delete the token <strong>{tokens[0]?.name}</strong>? This removes
          the token from Che. The GitHub authorization will remain active — to fully revoke access,
          also visit{' '}
          <a href="https://github.com/settings/applications" target="_blank" rel="noreferrer">
            github.com/settings/applications
          </a>
          .
        </Content>
      ) : (
        <Content component="p">
          Are you sure you want to delete <strong>{count}</strong> Device Authentication Tokens?
          This removes the tokens from Che and attempts to revoke the GitHub authorizations. If
          revocation fails, you can also manually revoke at{' '}
          <a href="https://github.com/settings/applications" target="_blank" rel="noreferrer">
            github.com/settings/applications
          </a>
          .
        </Content>
      );

    return (
      <Modal
        aria-label={modalTitle}
        variant={ModalVariant.small}
        isOpen={isOpen}
        onClose={() => this.handleCloseModal()}
        elementToFocus="[data-pf-initial-focus]"
      >
        <ModalHeader title={modalTitle} titleIconVariant="warning" />
        <ModalBody>
          <Content data-pf-initial-focus tabIndex={-1} style={{ outline: 'none' }}>
            {bodyText}
            <Checkbox
              id="delete-device-auth-token-warning-checkbox"
              isChecked={isChecked}
              label="I understand, this operation cannot be reverted."
              onChange={(_event, checked) => this.setState({ isChecked: checked })}
            />
          </Content>
        </ModalBody>
        <ModalFooter>
          <Button
            variant={ButtonVariant.danger}
            isDisabled={!isChecked}
            onClick={() => this.handleDelete()}
          >
            Delete
          </Button>
          <Button variant={ButtonVariant.link} onClick={() => this.handleCloseModal()}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}
