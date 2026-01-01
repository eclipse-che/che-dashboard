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
import { getStatusIcon } from '@/components/Workspace/Status/getStatusIcon';
import styles from '@/components/Workspace/Status/index.module.css';
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

    const hasSccMismatch = currentScc ? containerScc !== currentScc : false;

    // If SCC mismatch, show Failed status with special tooltip
    if (hasSccMismatch) {
      const icon = getStatusIcon(DevWorkspaceStatus.FAILED);
      const documentationUrl = branding.docs.containerRunCapabilities;
      const tooltip = (
        <span>
          Cannot start: Administrator enabled nested container capabilities. This workspace was
          created before this change and cannot be started.
          {documentationUrl && (
            <>
              {' '}
              <a
                href={documentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={event => event.stopPropagation()}
                style={{ color: '#73bcf7', textDecoration: 'underline' }}
              >
                Learn more
              </a>
            </>
          )}
        </span>
      );

      return (
        <CheTooltip content={tooltip}>
          <span
            className={styles.statusIndicator}
            data-testid="workspace-status-indicator"
            aria-label="Workspace status is Failed"
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
