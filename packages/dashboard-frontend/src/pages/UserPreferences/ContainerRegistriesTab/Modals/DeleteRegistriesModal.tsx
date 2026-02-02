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

import { RegistryEntry } from '@/store/DockerConfig';

type Props = {
  registry?: RegistryEntry;
  selectedItems: string[];
  isOpen: boolean;
  onDelete: (registry?: RegistryEntry) => void;
  onCancel: () => void;
};
type State = {
  warningInfoCheck: boolean;
};

export default class DeleteRegistriesModal extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = { warningInfoCheck: false };
  }

  public componentDidUpdate(prevProps: Props): void {
    if (prevProps.isOpen === this.props.isOpen && this.props.isOpen) {
      return;
    }

    this.setState({ warningInfoCheck: false });
  }

  public render(): React.ReactElement {
    const { isOpen, onCancel, onDelete, registry, selectedItems } = this.props;
    const { warningInfoCheck } = this.state;

    let text = 'Would you like to delete ';
    if (registry) {
      text += `registry '${registry.url}'`;
    } else {
      if (selectedItems.length === 1) {
        text += `registry '${selectedItems[0]}'`;
      } else {
        text += `${selectedItems.length} registries`;
      }
    }
    text += '?';

    const title = `Delete Container Registr${registry !== undefined ? 'y' : 'ies'}`;

    return (
      <Modal
        variant={ModalVariant.small}
        isOpen={isOpen}
        onClose={onCancel}
        aria-label="warning-info"
      >
        <ModalHeader title={title} titleIconVariant="warning" />
        <ModalBody>
          <Content>
            <Content component="p">{text}</Content>
            <Checkbox
              style={{ margin: '0 0 0 0.4rem' }}
              data-testid="warning-info-checkbox"
              isChecked={warningInfoCheck}
              onChange={(_event, checked) => {
                this.setState({ warningInfoCheck: checked });
              }}
              id="delete-warning-info-check"
              label="I understand, this operation cannot be reverted."
            />
          </Content>
        </ModalBody>
        <ModalFooter>
          <Button
            variant={ButtonVariant.danger}
            isDisabled={!warningInfoCheck}
            data-testid="delete-button"
            onClick={() => onDelete(registry)}
          >
            Delete
          </Button>
          <Button
            variant={ButtonVariant.link}
            data-testid="cancel-button"
            onClick={() => onCancel()}
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}
