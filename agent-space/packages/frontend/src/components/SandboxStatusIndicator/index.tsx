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

import { Icon, IconComponentProps, Tooltip } from '@patternfly/react-core';
import React from 'react';

import styles from '@/components/SandboxStatusIndicator/index.module.css';
import { PHASE_ICON } from '@/components/SandboxStatusLabel';
import { SandboxPhase } from '@/services/types';

const STATUS: Record<SandboxPhase, IconComponentProps['status']> = {
  [SandboxPhase.RUNNING]: 'success',
  [SandboxPhase.PENDING]: 'info',
  [SandboxPhase.SUSPENDED]: undefined,
  [SandboxPhase.COMPLETED]: undefined,
  [SandboxPhase.FAILED]: 'danger',
  [SandboxPhase.BLOCKED]: 'danger',
  [SandboxPhase.EXPIRED]: 'warning',
  // Plain, like the grey label the list shows: going away on request is not
  // a warning.
  [SandboxPhase.TERMINATING]: undefined,
};

export type Props = {
  phase: SandboxPhase;
  sandboxName: string;
};

/**
 * Phase of one sandbox as a single glyph, for the navigation sidebar.
 *
 * The same role the dashboard's `WorkspaceStatusIndicator` plays next to a
 * recent workspace: the list is read at a glance, and a full status label
 * would push the sandbox names out of the sidebar.
 */
export function SandboxStatusIndicator({ phase, sandboxName }: Props): React.ReactElement {
  return (
    <Tooltip content={phase} position="right">
      <span
        role="img"
        className={styles.statusIndicator}
        data-testid="sandbox-status-indicator"
        aria-label={`Sandbox ${sandboxName} status is ${phase}`}
      >
        <Icon isInline status={STATUS[phase]}>
          {PHASE_ICON[phase]}
        </Icon>
      </span>
    </Tooltip>
  );
}
