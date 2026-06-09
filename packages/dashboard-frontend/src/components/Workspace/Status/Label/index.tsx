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

import { Label, LabelProps } from '@patternfly/react-core';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { CheTooltip } from '@/components/CheTooltip';
import { getSccMismatchTooltip, useStatusIcon } from '@/components/Workspace/Status/getStatusIcon';
import styles from '@/components/Workspace/Status/index.module.css';
import { useAnnounceOnChange } from '@/components/WorkspaceProgress/StepTitle/useAnnounceOnChange';
import { hasSccMismatch } from '@/services/helpers/sccMismatch';
import {
  DeprecatedWorkspaceStatus,
  DevWorkspaceStatus,
  WorkspaceStatus,
} from '@/services/helpers/types';
import { RootState } from '@/store';
import { selectBranding } from '@/store/Branding/selectors';
import { selectCurrentScc } from '@/store/ServerConfig/selectors';

export type Props = MappedProps & {
  status: WorkspaceStatus | DevWorkspaceStatus | DeprecatedWorkspaceStatus;
  containerScc: string | undefined;
  /** When provided, status-change announcements include the workspace name. */
  workspaceName?: string;
};

const WorkspaceStatusLabelComponent: React.FC<Props> = ({
  status,
  containerScc,
  currentScc,
  branding,
  workspaceName,
}) => {
  // Only check SCC mismatch for stopped workspaces
  const isStopped = status === DevWorkspaceStatus.STOPPED;
  const sccMismatch = isStopped && hasSccMismatch(containerScc, currentScc);

  useAnnounceOnChange(status, s => {
    // STOPPED is the default/terminal state — announcing it causes "workspace stopped,
    // workspace starting" sequences that confuse screen readers when users start a
    // previously stopped workspace. The visual label still shows the status.
    if (s === DevWorkspaceStatus.STOPPED || s === WorkspaceStatus.STOPPED) {
      return '';
    }
    return workspaceName ? `Workspace ${workspaceName} status is ${s}` : `Workspace status is ${s}`;
  });

  let statusLabelColor: LabelProps['color'];
  switch (status) {
    case WorkspaceStatus.RUNNING:
    case DevWorkspaceStatus.RUNNING:
      statusLabelColor = 'green';
      break;
    case WorkspaceStatus.STARTING:
    case DevWorkspaceStatus.STARTING:
      statusLabelColor = 'blue';
      break;
    case DevWorkspaceStatus.FAILING:
    case WorkspaceStatus.ERROR:
    case DevWorkspaceStatus.FAILED:
    case 'Deprecated':
      statusLabelColor = 'orange';
      break;
    case WorkspaceStatus.STOPPED:
    case DevWorkspaceStatus.STOPPED:
    case WorkspaceStatus.STOPPING:
    case DevWorkspaceStatus.STOPPING:
    case DevWorkspaceStatus.TERMINATING:
      statusLabelColor = 'grey';
  }

  // Build tooltip content
  const tooltipContent: React.ReactNode = sccMismatch
    ? getSccMismatchTooltip(branding.docs.containerRunCapabilities)
    : status === 'Deprecated'
      ? 'Deprecated workspace'
      : status;

  // Use warning icon for SCC mismatch, otherwise use regular status icon
  const statusIcon = useStatusIcon(status);
  const warningIcon = useStatusIcon(DevWorkspaceStatus.FAILED);
  const icon = sccMismatch ? warningIcon : statusIcon;

  return (
    <CheTooltip content={tooltipContent}>
      <Label className={styles.statusLabel} color={statusLabelColor} icon={icon}>
        {status}
      </Label>
    </CheTooltip>
  );
};

const mapStateToProps = (state: RootState) => ({
  branding: selectBranding(state),
  currentScc: selectCurrentScc(state),
});

const connector = connect(mapStateToProps);

type MappedProps = ConnectedProps<typeof connector>;
export const WorkspaceStatusLabel = connector(WorkspaceStatusLabelComponent);
