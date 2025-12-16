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
  selectedItems: IGitOauth[];
  isOpen: boolean;
  onRevoke: () => void;
  onCancel: () => void;
};
type State = {
  warningInfoCheck: boolean;
};

export class GitServicesRevokeModal extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = { warningInfoCheck: false };
  }

  private handleRevoke(): void {
    this.setState({ warningInfoCheck: false });
    this.props.onRevoke();
  }

  private handleCancel(): void {
    this.setState({ warningInfoCheck: false });
    this.props.onCancel();
  }

  private handleCheckboxChange(_event: React.FormEvent<HTMLInputElement>, checked: boolean): void {
    this.setState({ warningInfoCheck: checked });
  }

  public render(): React.ReactElement {
    const { isOpen, selectedItems } = this.props;
    const { warningInfoCheck } = this.state;

    const title = `Revoke Git ${selectedItems.length === 1 ? 'Service' : 'Services'}`;

    let text = 'Would you like to revoke ';
    if (selectedItems.length === 1) {
      text += `git service "${GIT_OAUTH_PROVIDERS[selectedItems[0].name]}"`;
    } else {
      text += `${selectedItems.length} git services`;
    }
    text += '?';

    return (
      <Modal
        variant={ModalVariant.small}
        isOpen={isOpen}
        /* c8 ignore next 1 */
        onClose={() => this.handleCancel()}
        aria-label="Revoke Git Services Modal"
      >
        <ModalHeader title={title} titleIconVariant="warning" />
        <ModalBody>
          <Content data-testid="revoke-modal-content">
            <Content component="p">{text}</Content>
            <Checkbox
              data-testid="warning-info-checkbox"
              isChecked={warningInfoCheck}
              onChange={(event, checked) => this.handleCheckboxChange(event, checked)}
              id="revoke-warning-info-check"
              label="I understand, this operation cannot be reverted."
            />
          </Content>
        </ModalBody>
        <ModalFooter>
          <Button
            variant={ButtonVariant.danger}
            isDisabled={!warningInfoCheck}
            data-testid="revoke-button"
            onClick={() => this.handleRevoke()}
          >
            Revoke
          </Button>
          <Button
            variant={ButtonVariant.link}
            data-testid="cancel-button"
            onClick={() => this.handleCancel()}
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}
