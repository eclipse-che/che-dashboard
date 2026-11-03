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
  Alert,
  AlertVariant,
  Button,
  Content,
  ContentVariants,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Radio,
} from '@patternfly/react-core';
import React from 'react';

import {
  SandboxStorageType,
  STORAGE_TYPE_DESCRIPTIONS,
  STORAGE_TYPE_TITLES,
  STORAGE_TYPES,
} from '@/services/sandboxStorage';

export type Props = {
  isOpen: boolean;
  /** What the sandbox has now; the modal opens on it and compares against it. */
  originSelection: SandboxStorageType;
  onConfirm: (storageType: SandboxStorageType) => void;
  onCancel: () => void;
};

/**
 * 'Change Storage Type', the same dialog the dashboard shows for a workspace,
 * down to the warning above the radios.
 *
 * Save stays disabled until the selection differs from what the sandbox
 * carries, so an accidental open costs nothing.
 */
export function StorageTypeSelectorModal({
  isOpen,
  originSelection,
  onConfirm,
  onCancel,
}: Props): React.ReactElement {
  const [selected, setSelected] = React.useState<SandboxStorageType>(originSelection);

  // Reopening has to show what the sandbox carries now, not what was last
  // cancelled, and a save elsewhere changes it under this component.
  React.useEffect(() => {
    if (isOpen) {
      setSelected(originSelection);
    }
  }, [isOpen, originSelection]);

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onCancel}
      elementToFocus="[data-pf-initial-focus]"
      data-testid="storage-type-selector-modal"
    >
      <ModalHeader title="Change Storage Type" />
      <ModalBody>
        <Content data-pf-initial-focus tabIndex={-1} style={{ outline: 'none' }}>
          <Alert
            variant={AlertVariant.warning}
            title="Note that after changing the storage type you may lose the sandbox data."
            isInline
          />
          <Content component={ContentVariants.h6}>Select the storage type</Content>
          {STORAGE_TYPES.map(storageType => (
            <Content key={storageType} component={ContentVariants.h6}>
              <Radio
                label={STORAGE_TYPE_TITLES[storageType]}
                name={storageType}
                id={`${storageType}-type-radio`}
                description={STORAGE_TYPE_DESCRIPTIONS[storageType]}
                isChecked={selected === storageType}
                onChange={() => setSelected(storageType)}
              />
            </Content>
          ))}
        </Content>
      </ModalBody>
      <ModalFooter>
        <Button
          key="confirm"
          variant="primary"
          isDisabled={selected === originSelection}
          onClick={() => onConfirm(selected)}
        >
          Save
        </Button>
        <Button key="cancel" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
}
