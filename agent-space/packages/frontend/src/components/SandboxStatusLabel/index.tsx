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

import { Label, LabelProps, Tooltip } from '@patternfly/react-core';
import {
  BanIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  MoonIcon,
  OutlinedClockIcon,
  ResourcesFullIcon,
} from '@patternfly/react-icons';
import React from 'react';

import styles from '@/components/SandboxStatusLabel/index.module.css';
import { findBlockingCondition, findCondition, READY_CONDITION } from '@/services/sandbox';
import { Sandbox, SandboxPhase } from '@/services/types';

type PhaseAppearance = {
  color: LabelProps['color'];
  icon: React.ReactElement;
};

/**
 * Phases that are still moving get a turning glyph rather than a static one:
 * the rotation is what tells the user the page is live and nothing is stuck.
 *
 * It is a rotated icon and not a `Spinner` because a spinner takes its colour
 * from a variable of its own rather than from the label around it - see the
 * stylesheet.
 */
const inProgressIcon = <InProgressIcon className={styles.rotate} />;

/** The glyph of each phase, shared with the sidebar's status indicator. */
export const PHASE_ICON: Record<SandboxPhase, React.ReactElement> = {
  [SandboxPhase.RUNNING]: <ResourcesFullIcon />,
  [SandboxPhase.PENDING]: inProgressIcon,
  [SandboxPhase.SUSPENDED]: <MoonIcon />,
  [SandboxPhase.COMPLETED]: <CheckCircleIcon />,
  [SandboxPhase.FAILED]: <ExclamationCircleIcon />,
  [SandboxPhase.BLOCKED]: <BanIcon />,
  [SandboxPhase.EXPIRED]: <OutlinedClockIcon />,
  [SandboxPhase.TERMINATING]: inProgressIcon,
};

/**
 * Colour of each phase, following the dashboard's workspace status label:
 * green while up, blue while coming up, grey while going away or already
 * gone, and a warning colour only for something that actually went wrong.
 */
const APPEARANCE: Record<SandboxPhase, PhaseAppearance> = {
  [SandboxPhase.RUNNING]: { color: 'green', icon: PHASE_ICON[SandboxPhase.RUNNING] },
  [SandboxPhase.PENDING]: { color: 'blue', icon: PHASE_ICON[SandboxPhase.PENDING] },
  [SandboxPhase.SUSPENDED]: { color: 'purple', icon: PHASE_ICON[SandboxPhase.SUSPENDED] },
  [SandboxPhase.COMPLETED]: { color: 'grey', icon: PHASE_ICON[SandboxPhase.COMPLETED] },
  [SandboxPhase.FAILED]: { color: 'red', icon: PHASE_ICON[SandboxPhase.FAILED] },
  [SandboxPhase.BLOCKED]: { color: 'red', icon: PHASE_ICON[SandboxPhase.BLOCKED] },
  [SandboxPhase.EXPIRED]: { color: 'orange', icon: PHASE_ICON[SandboxPhase.EXPIRED] },
  // Grey like a stopping workspace: the sandbox is on its way out because
  // somebody asked it to be, which is not a fault worth an orange label.
  [SandboxPhase.TERMINATING]: { color: 'grey', icon: PHASE_ICON[SandboxPhase.TERMINATING] },
};

export type Props = {
  phase: SandboxPhase;
  /** When given, the reason behind the phase is shown as a tooltip. */
  sandbox?: Sandbox;
};

/**
 * Renders the lifecycle phase, with the condition that explains it attached as
 * a tooltip so a Blocked sandbox says *why* without opening the details page.
 */
export function SandboxStatusLabel({ phase, sandbox }: Props): React.ReactElement {
  const { color, icon } = APPEARANCE[phase];

  const label = (
    <Label className={styles.statusLabel} color={color} icon={icon} data-testid="sandbox-status">
      {phase}
    </Label>
  );

  if (sandbox === undefined) {
    return label;
  }

  const condition = findBlockingCondition(sandbox) ?? findCondition(sandbox, READY_CONDITION);
  const tooltip = condition?.message ?? condition?.reason;
  if (!tooltip) {
    return label;
  }

  return (
    <Tooltip content={tooltip} position="right">
      {label}
    </Tooltip>
  );
}
