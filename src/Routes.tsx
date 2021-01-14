/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
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
import { Route } from 'react-router';

import { ROUTE } from './route.enum';

const GetStartedPage = React.lazy(() => import('./pages/GetStarted'));
const WorkspacesListContainer = React.lazy(() => import('./containers/WorkspacesList'));
const WorkspaceDetailsContainer = React.lazy(() => import('./containers/WorkspaceDetails'));
const IdeLoaderContainer = React.lazy(() => import('./containers/IdeLoader'));
const FactoryLoaderContainer = React.lazy(() => import('./containers/FactoryLoader'));

export interface RouteItem {
  to: ROUTE;
  component: React.FunctionComponent<any>;
}

const items: RouteItem[] = [
  { to: ROUTE.GET_STARTED, component: GetStartedPage },
  { to: ROUTE.HOME, component: GetStartedPage },
  { to: ROUTE.WORKSPACES, component: WorkspacesListContainer },
  { to: ROUTE.WORKSPACE_DETAILS, component: WorkspaceDetailsContainer },
  { to: ROUTE.IDE_LOADER, component: IdeLoaderContainer },
  { to: ROUTE.LOAD_FACTORY, component: FactoryLoaderContainer },
];

function Routes(): React.ReactElement {
  const routes = items.map(item => (
    <Route exact
      key={item.to}
      path={item.to}
      component={item.component}
    />
  ));
  return (
    <React.Fragment>
      {routes}
    </React.Fragment>
  );
}
Routes.displayName = 'RoutesComponent';
export default Routes;
