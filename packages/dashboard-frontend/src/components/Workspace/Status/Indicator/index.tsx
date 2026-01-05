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

import { CheTooltip } from '@/components/CheTooltip';
import { getSccMismatchTooltip, getStatusIcon } from '@/components/Workspace/Status/getStatusIcon';
import styles from '@/components/Workspace/Status/index.module.css';
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
};

class WorkspaceStatusIndicatorComponent extends React.PureComponent<Props> {
  public render(): React.ReactElement {
    const { status, containerScc, branding, currentScc } = this.props;

    // Only check SCC mismatch for stopped workspaces
    const isStopped = status === DevWorkspaceStatus.STOPPED;
    const sccMismatch = isStopped && hasSccMismatch(containerScc, currentScc);

    // If SCC mismatch, show warning triangle icon with tooltip
    if (sccMismatch) {
      const icon = getStatusIcon(DevWorkspaceStatus.FAILED);
      const tooltip = getSccMismatchTooltip(branding.docs.containerRunCapabilities);

      return (
        <CheTooltip content={tooltip}>
          <span
            className={styles.statusIndicator}
            data-testid="workspace-status-indicator"
            aria-label="Workspace status has SCC mismatch warning"
          >
            {icon}
          </span>
        </CheTooltip>
      );
    }

    const icon = getStatusIcon(status);
    const tooltip = status === 'Deprecated' ? 'Deprecated workspace' : status.toLocaleUpperCase();

    return (
      <CheTooltip content={tooltip}>
        <span
          className={styles.statusIndicator}
          data-testid="workspace-status-indicator"
          aria-label={`Workspace status is ${status}`}
        >
          {icon}
        </span>
      </CheTooltip>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  branding: selectBranding(state),
  currentScc: selectCurrentScc(state),
});

const connector = connect(mapStateToProps);

type MappedProps = ConnectedProps<typeof connector>;
export const WorkspaceStatusIndicator = connector(WorkspaceStatusIndicatorComponent);
