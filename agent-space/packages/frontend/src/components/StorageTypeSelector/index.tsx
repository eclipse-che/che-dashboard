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

import { Button } from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import React from 'react';

import styles from '@/components/StorageTypeSelector/index.module.css';
import { StorageTypeSelectorModal } from '@/components/StorageTypeSelector/SelectorModal';
import { SandboxStorageType, STORAGE_TYPE_TITLES } from '@/services/sandboxStorage';

export type Props = {
  storageType: SandboxStorageType;
  /** Drops the pencil: the type is shown, but cannot be changed. */
  isDisabled?: boolean;
  onChange: (storageType: SandboxStorageType) => void;
};

/**
 * Where a sandbox keeps its work, shown the way a workspace shows it: the
 * current type as text, with a pencil that opens 'Change Storage Type'.
 */
export function StorageTypeSelector({
  storageType,
  isDisabled = false,
  onChange,
}: Props): React.ReactElement {
  const [isOpen, setIsOpen] = React.useState(false);

  // As with the AI tools: no pencil where there is nothing to be done with it.
  if (isDisabled) {
    return <span data-testid="storage-type-selector">{STORAGE_TYPE_TITLES[storageType]}</span>;
  }

  return (
    <span className={styles.editable} data-testid="storage-type-selector">
      {STORAGE_TYPE_TITLES[storageType]}
      <Button
        data-testid="storage-type-edit-toggle"
        variant="plain"
        onClick={() => setIsOpen(true)}
        aria-label="Change Storage Type"
        title="Change Storage Type"
      >
        <PencilAltIcon />
      </Button>
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
