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

import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { useEffect, useRef } from 'react';

import { CheTooltip } from '@/components/CheTooltip';
import { getSccMismatchTooltip, useStatusIcon } from '@/components/Workspace/Status/getStatusIcon';
import styles from '@/components/Workspace/Status/index.module.css';
import { enqueueAnnouncement } from '@/components/WorkspaceProgress/StepTitle/announceQueue';
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

const WorkspaceStatusIndicatorComponent: React.FC<Props> = ({
  status,
  containerScc,
  branding,
  currentScc,
  workspaceName,
}) => {
  // Only check SCC mismatch for stopped workspaces
  const isStopped = status === DevWorkspaceStatus.STOPPED;
  const sccMismatch = isStopped && hasSccMismatch(containerScc, currentScc);

  useAnnounceOnChange(status, s => {
    // STOPPED is the default/terminal state — announcing it causes "workspace stopped,
    // workspace starting" sequences that confuse screen readers when users start a
    // previously stopped workspace. The visual indicator still shows the status.
    if (s === DevWorkspaceStatus.STOPPED || s === WorkspaceStatus.STOPPED) {
      return '';
    }
    return workspaceName ? `Workspace ${workspaceName} status is ${s}` : `Workspace status is ${s}`;
  });

  // Track current status in a ref so the unmount cleanup can read the last value.
  const statusRef = useRef(status);
  statusRef.current = status;
  useEffect(() => {
    return () => {
      // When the component unmounts while TERMINATING, the workspace was deleted.
      if (statusRef.current === DevWorkspaceStatus.TERMINATING && workspaceName) {
        enqueueAnnouncement(`Workspace ${workspaceName} removed`);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusIcon = useStatusIcon(status);
  const warningIcon = useStatusIcon(DevWorkspaceStatus.FAILED);
  const icon = sccMismatch ? warningIcon : statusIcon;

  const tooltip: React.ReactNode = sccMismatch
    ? getSccMismatchTooltip(branding.docs.containerRunCapabilities)
    : status === 'Deprecated'
      ? 'Deprecated workspace'
      : status.toLocaleUpperCase();

  const statusAriaLabel = sccMismatch
    ? 'Workspace status has SCC mismatch warning'
    : `Workspace status is ${status}`;

  return (
    <CheTooltip content={tooltip}>
      <span
        role="img"
        className={styles.statusIndicator}
        data-testid="workspace-status-indicator"
        aria-label={statusAriaLabel}
      >
        {icon}
      </span>
    </CheTooltip>
  );
};

const mapStateToProps = (state: RootState) => ({
  branding: selectBranding(state),
  currentScc: selectCurrentScc(state),
});

const connector = connect(mapStateToProps);

type MappedProps = ConnectedProps<typeof connector>;
export const WorkspaceStatusIndicator = connector(WorkspaceStatusIndicatorComponent);
