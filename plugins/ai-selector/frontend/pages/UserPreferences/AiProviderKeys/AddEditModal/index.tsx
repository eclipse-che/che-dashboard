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
  Form,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';
import React from 'react';

import { AiProviderKeysAddEditForm } from '@/plugins/ai-selector/pages/UserPreferences/AiProviderKeys/AddEditModal/Form';

export type Props = {
  isOpen: boolean;
  availableProviders: api.AiToolDefinition[];
  fixedProvider?: api.AiToolDefinition;
  onSave: (providerId: string, apiKey: string) => void;
  onCloseModal: () => void;
};

export type State = {
  providerId: string;
  apiKey: string;
  isSaveEnabled: boolean;
};

export class AiProviderKeysAddEditModal extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      providerId:
        props.fixedProvider?.providerId ?? (props.availableProviders[0]?.providerId || ''),
      apiKey: '',
      isSaveEnabled: false,
    };
  }

  public componentDidUpdate(prevProps: Props): void {
    if (prevProps.isOpen !== this.props.isOpen && this.props.isOpen) {
      this.setState({
        providerId:
          this.props.fixedProvider?.providerId ??
          (this.props.availableProviders[0]?.providerId || ''),
        apiKey: '',
        isSaveEnabled: false,
      });
    }
  }

  private handleSave(): void {
    const { providerId, apiKey } = this.state;
    if (providerId && apiKey) {
      this.props.onSave(providerId, apiKey);
    }
  }

  private handleFormChange(providerId: string, apiKey: string, isValid: boolean): void {
    this.setState({ providerId, apiKey, isSaveEnabled: isValid });
  }

  public render(): React.ReactElement {
    const { isOpen, availableProviders, fixedProvider, onCloseModal } = this.props;
    const { isSaveEnabled } = this.state;

    const isUpdateMode = fixedProvider !== undefined;
    const modalTitle = isUpdateMode
      ? `Update ${fixedProvider.name} API Key`
      : 'Add AI Provider Key';

    return (
      <Modal
        variant={ModalVariant.small}
        isOpen={isOpen}
        onClose={onCloseModal}
        aria-label="add-edit-ai-provider-key"
        elementToFocus="[data-pf-initial-focus]"
      >
        <ModalHeader title={modalTitle} />
        <ModalBody>
          <div data-pf-initial-focus tabIndex={-1} style={{ outline: 'none' }}>
            <Form onSubmit={e => e.preventDefault()}>
              <AiProviderKeysAddEditForm
                providers={availableProviders}
                fixedProvider={fixedProvider}
                onChange={(...args) => this.handleFormChange(...args)}
              />
            </Form>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant={ButtonVariant.primary}
            isDisabled={!isSaveEnabled}
            data-testid="save-button"
            onClick={() => this.handleSave()}
          >
            {isUpdateMode ? 'Save' : 'Add'}
          </Button>
          <Button variant={ButtonVariant.link} data-testid="cancel-button" onClick={onCloseModal}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}
