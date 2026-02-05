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
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';
import React from 'react';

import { AddModalForm } from '@/pages/UserPreferences/SshKeys/AddModal/Form';

export type Props = {
  isOpen: boolean;
  onSaveSshKey: (sshKey: api.NewSshKey) => void;
  onCloseModal: () => void;
};
export type State = {
  sshKey: api.NewSshKey | undefined;
  isSaveEnabled: boolean;
};

export class SshKeysAddModal extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      sshKey: undefined,
      // initially disabled until something changes and form is valid
      isSaveEnabled: false,
    };
  }

  private handleSaveSshKey(): void {
    const { sshKey } = this.state;
    if (sshKey) {
      this.props.onSaveSshKey(sshKey);
    }
  }

  private handleCloseModal(): void {
    this.props.onCloseModal();
  }

  private handleChangeSshKey(sshKey: api.NewSshKey, isValid: boolean): void {
    this.setState({
      sshKey,
      isSaveEnabled: isValid,
    });
  }

  public render(): React.ReactElement {
    const { isOpen } = this.props;
    const isDisabled = this.state.isSaveEnabled === false;
    const modalTitle = 'Add SSH Keys';

    return (
      <Modal
        aria-label={modalTitle}
        variant={ModalVariant.small}
        isOpen={isOpen}
        onClose={() => this.handleCloseModal()}
      >
        <ModalHeader title={modalTitle} />
        <ModalBody>
          <AddModalForm onChange={(...args) => this.handleChangeSshKey(...args)} />
        </ModalBody>
        <ModalFooter>
          <Button
            variant={ButtonVariant.primary}
            isDisabled={isDisabled}
            onClick={() => this.handleSaveSshKey()}
          >
            Add
          </Button>
          <Button variant={ButtonVariant.link} onClick={() => this.handleCloseModal()}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}
