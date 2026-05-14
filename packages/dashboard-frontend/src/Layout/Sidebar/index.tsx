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

import { Nav, PageSidebar, PageSidebarBody } from '@patternfly/react-core';
import { History } from 'history';
import React from 'react';

import Navigation from '@/Layout/Navigation';
import styles from '@/Layout/Sidebar/index.module.css';
import NavigationAgentList from '@/plugins/dashboard-ai-agent/navigation/AgentList';

export type Props = {
  history: History;
};

export class Sidebar extends React.PureComponent<Props> {
  public render(): React.ReactElement {
    const { history } = this.props;

    return (
      <PageSidebar>
        <PageSidebarBody className={styles.sidebarBody}>
          <div className={styles.mainNavWrapper}>
            <Navigation history={history} />
          </div>
          <div className={styles.agentNavWrapper}>
            <Nav aria-label="Agent Pods">
              <NavigationAgentList activePath="" />
            </Nav>
          </div>
        </PageSidebarBody>
      </PageSidebar>
    );
  }
}
