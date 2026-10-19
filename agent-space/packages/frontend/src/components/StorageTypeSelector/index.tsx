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

import { Button, HelperText, HelperTextItem } from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import React from 'react';

import styles from '@/components/StorageTypeSelector/index.module.css';
import { StorageTypeSelectorModal } from '@/components/StorageTypeSelector/SelectorModal';
import { SandboxStorageType, STORAGE_TYPE_TITLES } from '@/services/sandboxStorage';

export type Props = {
  storageType: SandboxStorageType;
  isDisabled?: boolean;
  /** Shown beside the pencil while it is disabled, so the reason is not a guess. */
  disabledReason?: string;
  onChange: (storageType: SandboxStorageType) => void;
};

/**
 * Where a sandbox keeps its work, shown the way a workspace shows it: the
 * current type as text, with a pencil that opens 'Change Storage Type'.
 */
export function StorageTypeSelector({
  storageType,
  isDisabled = false,
  disabledReason,
  onChange,
}: Props): React.ReactElement {
  const [isOpen, setIsOpen] = React.useState(false);

  const hint = isDisabled ? disabledReason : undefined;

  return (
    <span className={styles.editable} data-testid="storage-type-selector">
      {STORAGE_TYPE_TITLES[storageType]}
      <Button
        data-testid="storage-type-edit-toggle"
        variant="plain"
        isDisabled={isDisabled}
        onClick={() => setIsOpen(true)}
        aria-label="Change Storage Type"
        title={hint ?? 'Change Storage Type'}
      >
        <PencilAltIcon />
      </Button>
      {hint !== undefined && (
        <HelperText>
          <HelperTextItem data-testid="storage-type-disabled-reason">{hint}</HelperTextItem>
        </HelperText>
      )}
      <StorageTypeSelectorModal
        isOpen={isOpen}
        originSelection={storageType}
        onConfirm={next => {
          setIsOpen(false);
          onChange(next);
        }}
        onCancel={() => setIsOpen(false)}
      />
    </span>
  );
}
