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

import { Icon } from '@patternfly/react-core';
import {
  ExclamationTriangleIcon,
  InProgressIcon,
  ResourcesFullIcon,
} from '@patternfly/react-icons';
import React from 'react';

import styles from '@/components/Workspace/Status/index.module.css';
import { StoppedIcon } from '@/components/Workspace/Status/StoppedIcon';
import { useTheme } from '@/contexts/ThemeContext';
import { DevWorkspaceStatus, WorkspaceStatus } from '@/services/helpers/types';

// Theme-aware grey colors using PatternFly 6 tokens
const lightGreyCssVariable = 'var(--pf-t--global--text--color--regular)';
const darkGreyCssVariable = 'var(--pf-t--global--text--color--subtle)';

export function getStatusIcon(status: string, isDarkTheme: boolean) {
  const greyColor = isDarkTheme ? darkGreyCssVariable : lightGreyCssVariable;

  let icon: React.ReactElement;
  switch (status) {
    case DevWorkspaceStatus.STOPPED:
    case WorkspaceStatus.STOPPED:
      icon = (
        <Icon isInline color={greyColor}>
          <StoppedIcon />
        </Icon>
      );
      break;
    case DevWorkspaceStatus.RUNNING:
    case WorkspaceStatus.RUNNING:
      icon = (
        <Icon status="success" isInline>
          <ResourcesFullIcon />
        </Icon>
      );
      break;
    case DevWorkspaceStatus.FAILING:
      icon = (
        <Icon status="warning" isInline>
          <InProgressIcon className={styles.rotate} />
        </Icon>
      );
      break;
    case DevWorkspaceStatus.STARTING:
    case WorkspaceStatus.STARTING:
      icon = (
        <Icon status="info" isInline>
          <InProgressIcon className={styles.rotate} />
        </Icon>
      );
      break;
    case DevWorkspaceStatus.FAILED:
    case WorkspaceStatus.ERROR:
    case 'Deprecated':
      icon = (
        <Icon status="warning" isInline>
          <ExclamationTriangleIcon />
        </Icon>
      );
      break;
    default:
      icon = (
        <Icon isInline>
          <InProgressIcon className={styles.rotate} color={greyColor} />
        </Icon>
      );
  }
  return icon;
}

// Hook version that automatically uses theme context
export function useStatusIcon(status: string): React.ReactElement {
  const { isDarkTheme } = useTheme();
  return getStatusIcon(status, isDarkTheme);
}
