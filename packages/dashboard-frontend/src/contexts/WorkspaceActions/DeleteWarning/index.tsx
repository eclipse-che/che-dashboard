/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
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
  Modal,
  ModalVariant,
  Text,
  TextContent,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import React from 'react';

import { WantDelete } from '@/contexts/WorkspaceActions';

export type Props = {
  isOpen: boolean;
  wantDelete: WantDelete;
  onProceedAnyway: () => void;
  onClose: () => void;
};

export class WorkspaceActionsDeleteWarning extends React.PureComponent<Props> {
  private handleClose(): void {
    this.props.onClose();
  }

  private handleProceedAnyway(): void {
    this.props.onProceedAnyway();
    this.props.onClose();
  }

  public render(): React.ReactElement {
    const { isOpen, wantDelete } = this.props;

    let warningMessage: React.ReactElement;
    if (wantDelete.length === 1) {
      const workspaceName = wantDelete[0];
      warningMessage = (
        <TextContent>
          <Text>
            <b>{workspaceName}</b> workspace has <b>Per-user</b> storage type. There is a
            possibility that the <b>Per-user</b> storage type e.g. common PVC is used for all
            workspaces and that PVC has the RWO access mode.&emsp;
            <a
              target="_blank"
              rel="noopener noreferrer"
              style={{ whiteSpace: 'nowrap' }}
              href="https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes"
            >
              Learn more <ExternalLinkAltIcon />
            </a>
          </Text>
          <Text>
            To prevent possible problems with removal, you need to stop other workspaces with&nbsp;
            <b>Per-user</b>&nbsp;storage type before deleting.
          </Text>
        </TextContent>
      );
    } else {
      warningMessage = (
        <TextContent>
          <Text>
            One of deleting workspaces has <b>Per-user</b> storage type. There is a possibility that
            the <b>Per-user</b> storage type e.g. common PVC is used for all workspaces and that PVC
            has the RWO access mode.&emsp;
            <a
              target="_blank"
              rel="noopener noreferrer"
              style={{ whiteSpace: 'nowrap' }}
              href="https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes"
            >
              Learn more <ExternalLinkAltIcon />
            </a>
          </Text>
          <Text>
            To prevent possible problems with removal, you need to stop other workspaces with&nbsp;
            <b>Per-user</b>&nbsp;storage type before deleting.
          </Text>
        </TextContent>
      );
    }

    const body = (
      <TextContent>
        <Text>{warningMessage}</Text>
      </TextContent>
    );

    const footer = (
      <React.Fragment>
        <Button
          variant={ButtonVariant.danger}
          data-testid="proceed-anyway-button"
          onClick={() => this.handleProceedAnyway()}
        >
          Proceed Anyway
        </Button>
        <Button
          variant={ButtonVariant.link}
          data-testid="close-button"
          onClick={() => this.handleClose()}
        >
          Cancel
        </Button>
      </React.Fragment>
    );

    return (
      <Modal
        aria-label="Delete workspaces warning window"
        footer={footer}
        isOpen={isOpen}
        title="Delete Workspace Warning"
        titleIconVariant="warning"
        variant={ModalVariant.small}
        onClose={() => this.handleClose()}
      >
        {body}
      </Modal>
    );
  }
}
