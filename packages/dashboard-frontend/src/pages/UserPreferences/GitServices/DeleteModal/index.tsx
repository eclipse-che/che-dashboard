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

import { GIT_OAUTH_PROVIDERS } from '@/pages/UserPreferences/const';
import { IGitOauth } from '@/store/GitOauthConfig';

export type Props = {
  isOpen: boolean;
  deleteItem: IGitOauth | undefined;
  onCloseModal: () => void;
  onDelete: () => void;
};
export type State = {
  isChecked: boolean;
};

export class GitServicesDeleteModal extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      isChecked: false,
    };
  }

  private handleDelete(): void {
    this.setState({ isChecked: false });
    this.props.onDelete();
  }

  private handleCloseModal(): void {
    this.setState({ isChecked: false });
    this.props.onCloseModal();
  }

  public render(): React.ReactElement {
    const { deleteItem, isOpen } = this.props;
    const { isChecked } = this.state;

    const modalTitle = 'Delete Git Service Token';
    const serviceName = deleteItem !== undefined ? GIT_OAUTH_PROVIDERS[deleteItem.name] : '';

    return (
      <Modal
        aria-label={modalTitle}
        variant={ModalVariant.small}
        isOpen={isOpen}
        /* c8 ignore next 1 */
        onClose={() => this.handleCloseModal()}
        elementToFocus="[data-pf-initial-focus]"
      >
        <ModalHeader title={modalTitle} titleIconVariant="warning" />
        <ModalBody>
          <Content
            data-testid="delete-modal-content"
            data-pf-initial-focus
            tabIndex={-1}
            style={{ outline: 'none' }}
          >
            <Content component="p">
              Would you like to delete the OAuth token for git service &quot;{serviceName}&quot;?
            </Content>
            <Checkbox
              data-testid="warning-info-checkbox"
              id="delete-git-service-token-warning-checkbox"
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
            data-testid="delete-button"
            onClick={() => this.handleDelete()}
          >
            Delete
          </Button>
          <Button
            variant={ButtonVariant.link}
            data-testid="cancel-button"
            onClick={() => this.handleCloseModal()}
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}
