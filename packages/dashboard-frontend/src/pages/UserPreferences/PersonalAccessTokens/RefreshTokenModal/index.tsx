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
  Content,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';
import React from 'react';

import { GIT_PROVIDERS } from '@/pages/UserPreferences/const';

export type Props = {
  isOpen: boolean;
  token: api.PersonalAccessToken | undefined;
  onCloseModal: () => void;
  onRefresh: (token: api.PersonalAccessToken) => void;
};

export class PersonalAccessTokenRefreshModal extends React.PureComponent<Props> {
  private handleRefresh(): void {
    const { token } = this.props;
    if (token !== undefined) {
      this.props.onRefresh(token);
    }
  }

  private handleCloseModal(): void {
    this.props.onCloseModal();
  }

  public render(): React.ReactElement {
    const { isOpen, token } = this.props;
    const modalTitle = 'Refresh oAuth token';
    const body =
      token !== undefined
        ? `Request a new oAuth token for ${GIT_PROVIDERS[token.gitProvider]}`
        : 'Request a new oAuth token';

    return (
      <Modal
        aria-label={modalTitle}
        variant={ModalVariant.small}
        isOpen={isOpen}
        onClose={() => this.handleCloseModal()}
        elementToFocus="[data-pf-initial-focus]"
      >
        <ModalHeader title={modalTitle} />
        <ModalBody>
          <Content data-pf-initial-focus tabIndex={-1} style={{ outline: 'none' }}>
            <Content component="p">{body}</Content>
          </Content>
        </ModalBody>
        <ModalFooter>
          <Button variant={ButtonVariant.primary} onClick={() => this.handleRefresh()}>
            Ok
          </Button>
          <Button variant={ButtonVariant.link} onClick={() => this.handleCloseModal()}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}
