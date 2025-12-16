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
  pluralize,
} from '@patternfly/react-core';
import React from 'react';

export type Props = {
  isOpen: boolean;
  deleteItems: api.PersonalAccessToken[];
  onCloseModal: () => void;
  onDelete: (tokens: api.PersonalAccessToken[]) => void;
};
export type State = {
  isChecked: boolean;
};

export class PersonalAccessTokenDeleteModal extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      isChecked: false,
    };
  }

  private handleDelete(): void {
    this.setState({ isChecked: false });
    this.props.onDelete(this.props.deleteItems);
  }

  private handleCloseModal(): void {
    this.setState({ isChecked: false });
    this.props.onCloseModal();
  }

  public render(): React.ReactElement {
    const { isOpen, deleteItems } = this.props;
    const { isChecked } = this.state;

    const tokens = pluralize(deleteItems.length, 'token');
    const modalTitle = `Delete Personal Access ${tokens}`;

    return (
      <Modal
        aria-label={modalTitle}
        variant={ModalVariant.small}
        isOpen={isOpen}
        onClose={() => this.handleCloseModal()}
      >
        <ModalHeader title={modalTitle} titleIconVariant="warning" />
        <ModalBody>
          <Content>
            <Content component="p">Are you sure you want to delete the selected {tokens}?</Content>
            <Checkbox
              id="delete-tokens-warning-checkbox"
              isChecked={isChecked}
              label="I understand, this operation cannot be reverted."
              onChange={(_event, checked) => this.setState({ isChecked: checked })}
            />
          </Content>
        </ModalBody>
        <ModalFooter>
          <Button
            variant={ButtonVariant.danger}
            isDisabled={isChecked === false}
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
