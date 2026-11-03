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

import { Content, Modal, ModalBody, ModalHeader, ModalVariant } from '@patternfly/react-core';
import React from 'react';

import { DEFAULT_STORAGE_SIZE, STORAGE_MOUNT_PATH } from '@/services/sandboxStorage';

export type Props = {
  isOpen: boolean;
  onClose: () => void;
};

/**
 * What the two storage types mean for a sandbox.
 *
 * Under the same title the workspace overview uses, because a user who has
 * asked this question once should not get a different kind of answer here.
 * What differs is the content: a workspace chooses between claims shared
 * across a namespace, a sandbox between a claim of its own and none.
 */
export function StorageTypeInfoModal({ isOpen, onClose }: Props): React.ReactElement {
  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onClose}
      elementToFocus="[data-pf-initial-focus]"
      data-testid="storage-type-info-modal"
    >
      <ModalHeader title="Storage Type Info" />
      <ModalBody>
        <div data-pf-initial-focus tabIndex={-1} style={{ outline: 'none' }}>
          <Content>
            <Content component="p">
              <b>Per-sandbox Storage</b> gives the sandbox a {DEFAULT_STORAGE_SIZE} persistent
              volume claim of its own, mounted at <code>{STORAGE_MOUNT_PATH}</code>. Everything the
              agent leaves there is still there after the sandbox is suspended and resumed. The
              claim is deleted together with the sandbox.
            </Content>
            <Content component="p">
              <b>Ephemeral Storage</b> allows for faster I/O but may have limited storage and is not
              persistent. <code>{STORAGE_MOUNT_PATH}</code> lives on the node for as long as the pod
              does, so suspending the sandbox discards it.
            </Content>
          </Content>
        </div>
      </ModalBody>
    </Modal>
  );
}
