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

export type Props = {
  isOpen: boolean;
  /** One name for a row action, several for a bulk delete. */
  sandboxNames: string[];
  isDeleting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * Deleting a sandbox destroys the pod and any volume the controller created
 * for it, so the action is behind an explicit acknowledgement rather than a
 * plain Yes/No.
 */
export function DeleteSandboxModal({
  isOpen,
  sandboxNames,
  isDeleting = false,
  onConfirm,
  onClose,
}: Props): React.ReactElement {
  const [isConfirmed, setIsConfirmed] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setIsConfirmed(false);
    }
  }, [isOpen]);

  return (
    <Modal
      aria-label="Delete sandbox confirmation window"
      isOpen={isOpen}
      variant={ModalVariant.small}
      onClose={onClose}
      elementToFocus="[data-pf-initial-focus]"
    >
      <ModalHeader
        title={sandboxNames.length > 1 ? 'Delete Agent Spaces' : 'Delete Agent Space'}
        titleIconVariant="warning"
      />
      <ModalBody>
        <Content data-pf-initial-focus tabIndex={-1} style={{ outline: 'none' }}>
          {sandboxNames.length > 1 ? (
            <>
              <Content component="p">
                Would you like to delete {sandboxNames.length} agent spaces?
              </Content>
              <Content component="ul" data-testid="delete-sandbox-names">
                {sandboxNames.map(name => (
                  <Content component="li" key={name}>
                    {name}
                  </Content>
                ))}
              </Content>
            </>
          ) : (
            <Content component="p">
              Would you like to delete the agent space &quot;{sandboxNames[0]}&quot;?
            </Content>
          )}
          <Checkbox
            id="delete-sandbox-confirmation"
            data-testid="confirmation-checkbox"
            isChecked={isConfirmed}
            onChange={(_event, checked) => setIsConfirmed(checked)}
            label="I understand, this operation cannot be reverted."
          />
        </Content>
      </ModalBody>
      <ModalFooter>
        <Button
          variant={ButtonVariant.danger}
          isDisabled={!isConfirmed || isDeleting}
          isLoading={isDeleting}
          data-testid="delete-sandbox-button"
          onClick={onConfirm}
        >
          Delete
        </Button>
        <Button variant={ButtonVariant.link} data-testid="close-button" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
}
