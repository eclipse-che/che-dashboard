/*
 * Copyright (c) 2018-2026 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { PageSidebar, PageSidebarBody } from '@patternfly/react-core';
import { History } from 'history';
import React from 'react';

import Navigation from '@/Layout/Navigation';

export type Props = {
  history: History;
};

export class Sidebar extends React.PureComponent<Props> {
  public render(): React.ReactElement {
    const { history } = this.props;

    return (
      <PageSidebar>
        <PageSidebarBody>
          <Navigation history={history} />
        </PageSidebarBody>
      </PageSidebar>
    );
  }
}
