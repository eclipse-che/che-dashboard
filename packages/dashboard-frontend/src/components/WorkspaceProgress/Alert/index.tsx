/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { Alert, AlertActionLink, AlertGroup } from '@patternfly/react-core';
import React from 'react';

import { ActionGroupSelector } from '@/components/WorkspaceProgress/Alert/ActionGroupSelector';
import styles from '@/components/WorkspaceProgress/Alert/index.module.css';
import { AlertItem, isActionGroup } from '@/services/helpers/types';

export type Props = {
  isToast: boolean;
  alertItems: AlertItem[];
};

export class ProgressAlert extends React.PureComponent<Props> {
  private buildAlerts(alertItems: AlertItem[], isInline: boolean): React.ReactNode[] {
    return alertItems.map(alertItem => {
      const alertActionLinks = alertItem.actionCallbacks?.map(entry => {
        if (isActionGroup(entry)) {
          return <ActionGroupSelector key={entry.title} actionGroup={entry} />;
        }
        return (
          <AlertActionLink key={entry.title} onClick={() => entry.callback()}>
            {entry.title}
          </AlertActionLink>
        );
      });
      return (
        <Alert
          className={styles.fixOverflow}
          data-testid="loader-alert"
          aria-label="Loader Alert"
          isInline={isInline}
          key={alertItem.key}
          title={alertItem.title}
          variant={alertItem.variant}
          actionLinks={<React.Fragment>{alertActionLinks}</React.Fragment>}
        >
          {alertItem.children}
        </Alert>
      );
    });
  }

  render(): React.ReactElement {
    const { alertItems, isToast } = this.props;

    if (alertItems.length === 0) {
      return <></>;
    }

    const isInline = !isToast;
    const alerts = this.buildAlerts(alertItems, isInline);

    return (
      <AlertGroup
        data-testid="loader-alerts-group"
        aria-label="Loader Alerts Group"
        isToast={isToast}
      >
        {alerts}
      </AlertGroup>
    );
  }
}
