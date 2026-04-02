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
  provider: api.AiToolDefinition | undefined;
  onCloseModal: () => void;
  onDelete: (provider: api.AiToolDefinition) => void;
};

export type State = {
  isChecked: boolean;
};

export class AiProviderKeysDeleteModal extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { isChecked: false };
  }

  private handleDelete(): void {
    const { provider } = this.props;
    if (provider) {
      this.setState({ isChecked: false });
      this.props.onDelete(provider);
    }
  }

  private handleCloseModal(): void {
    this.setState({ isChecked: false });
    this.props.onCloseModal();
  }

  public render(): React.ReactElement {
    const { isOpen, provider } = this.props;
    const { isChecked } = this.state;

    const modalTitle = provider ? `Delete ${provider.name} API Key` : 'Delete API Key';

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
            <Content component="p">
              Are you sure you want to delete the <strong>{provider?.name}</strong> API key? The key
              will be removed from all your workspaces immediately.
            </Content>
            <Checkbox
              id="delete-ai-key-warning-checkbox"
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
