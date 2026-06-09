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

import { PageContext, PageSidebar, PageSidebarBody } from '@patternfly/react-core';
import { History } from 'history';
import React from 'react';

import { useAnnounceOnChange } from '@/components/WorkspaceProgress/StepTitle/useAnnounceOnChange';
import Navigation from '@/Layout/Navigation';

export type Props = {
  history: History;
};

export function Sidebar({ history }: Props): React.ReactElement {
  const { isSidebarOpen } = React.useContext(PageContext);

  // When the sidebar is collapsed PatternFly sets aria-hidden="true" on
  // #page-sidebar but leaves child <a> / <button> elements in the tab order,
  // violating WCAG 4.1.2.  Adding the HTML `inert` attribute when closed
  // removes the entire subtree from keyboard navigation and the accessibility
  // tree without unmounting it, which is the correct fix.
  const inertProp = isSidebarOpen ? {} : ({ inert: '' } as React.HTMLAttributes<HTMLDivElement>);

  useAnnounceOnChange(isSidebarOpen, open =>
    open ? 'Navigation expanded' : 'Navigation collapsed',
  );

  return (
    <PageSidebar {...inertProp}>
      <PageSidebarBody>
        <Navigation history={history} />
      </PageSidebarBody>
    </PageSidebar>
  );
}
