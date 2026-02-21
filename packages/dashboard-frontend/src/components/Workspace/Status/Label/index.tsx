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

class WorkspaceStatusLabelComponent extends React.PureComponent<Props> {
  render(): React.ReactElement {
    const { status, containerScc, currentScc, branding } = this.props;

    // Only check SCC mismatch for stopped workspaces
    const isStopped = status === DevWorkspaceStatus.STOPPED;
    const sccMismatch = isStopped && hasSccMismatch(containerScc, currentScc);

    // Show actual status, add warning icon only if SCC mismatch
    const displayStatus = status;

    let statusLabelColor: LabelProps['color'];
    switch (displayStatus) {
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
    let tooltipContent: React.ReactNode;
    if (sccMismatch) {
      tooltipContent = getSccMismatchTooltip(branding.docs.containerRunCapabilities);
    } else if (displayStatus === 'Deprecated') {
      tooltipContent = 'Deprecated workspace';
    } else {
      tooltipContent = displayStatus;
    }

    // Use warning icon for SCC mismatch, otherwise use regular status icon
    const icon = sccMismatch
      ? getStatusIcon(DevWorkspaceStatus.FAILED)
      : getStatusIcon(displayStatus);

    return (
      <CheTooltip content={tooltipContent}>
        <Label className={styles.statusLabel} color={statusLabelColor} icon={icon}>
          {displayStatus}
        </Label>
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
export const WorkspaceStatusLabel = connector(WorkspaceStatusLabelComponent);
