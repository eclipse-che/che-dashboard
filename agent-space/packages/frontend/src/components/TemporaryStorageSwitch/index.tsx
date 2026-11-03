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

import { Switch, Tooltip } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import React from 'react';

import styles from '@/components/TemporaryStorageSwitch/index.module.css';

export const TEMPORARY_STORAGE_SWITCH_ID = 'temporary-storage-switch';

export type Props = {
  isTemporary: boolean;
  isDisabled?: boolean;
  onChange: (isTemporary: boolean) => void;
};

/**
 * Storage for the sample gallery, as the dashboard's own gallery offers it: one
 * switch rather than the two-way dialog the details page uses.
 *
 * A card is a single click, so the choice has to be made before it and in as
 * little space as possible. Off is a claim of its own, on is an `emptyDir` -
 * the same two types the wizard lists, named the way the dashboard names them.
 */
export function TemporaryStorageSwitch({
  isTemporary,
  isDisabled = false,
  onChange,
}: Props): React.ReactElement {
  return (
    <div
      style={{ display: 'contents' }}
      onKeyDown={(event: React.KeyboardEvent) => {
        if ((event.key === 'Enter' || event.key === ' ') && !isDisabled) {
          event.preventDefault();
          onChange(!isTemporary);
        }
      }}
    >
      <Switch
        id={TEMPORARY_STORAGE_SWITCH_ID}
        data-testid={TEMPORARY_STORAGE_SWITCH_ID}
        isDisabled={isDisabled}
        isChecked={isTemporary}
        onChange={(_event, checked: boolean) => onChange(checked)}
        label={
          <div style={{ minWidth: '170px' }}>
            Temporary Storage
            <Tooltip
              exitDelay={1500}
              content="Temporary Storage allows for faster I/O but may have limited storage and is not persistent. Turn it off to give the sandbox a persistent volume claim of its own, kept across suspends."
            >
              <OutlinedQuestionCircleIcon
                className={styles.questionIcon}
                data-testid="temporary-storage-info"
              />
            </Tooltip>
          </div>
        }
      />
    </div>
  );
}
