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
import { useSelector } from 'react-redux';
import { Params, Route, Routes } from 'react-router-dom';

import AgentSpaceContainer from '@/containers/AgentSpace';
import GetStartedContainer from '@/containers/GetStarted';
import RestoreFromBackupContainer from '@/containers/RestoreFromBackup';
import UserPreferencesContainer from '@/containers/UserPreferences';
import WorkspaceDetailsContainer from '@/containers/WorkspaceDetails';
import WorkspacesListContainer from '@/containers/WorkspacesList';
import { Redirects } from '@/Routes/Redirects';
import { selectAgentSandboxEnabled } from '@/store/ServerConfig/selectors';

export enum ROUTE {
  HOME = '/',
  GET_STARTED = '/create-workspace',
  WORKSPACES = '/workspaces',
  AGENT_SPACE = '/agent-space',
  WORKSPACE_DETAILS = '/workspace/:namespace/:workspaceName',
  WORKSPACE_DETAILS_TAB = '/workspace/:namespace/:workspaceName?tab=:tabId',
  IDE_LOADER = '/ide/:namespace/:workspaceName',
  IDE_LOADER_TAB = '/ide/:namespace/:workspaceName?tab=:tabId',
  RESTORE_FROM_BACKUP = '/restore-from-backup',
  FACTORY_LOADER = '/load-factory',
  FACTORY_LOADER_URL = '/load-factory?url=:url',
  USER_PREFERENCES = '/user-preferences',
  USER_PREFERENCES_TAB = '/user-preferences?tab=:tabId',
}

export type WorkspaceRouteParams = Params<'namespace' | 'workspaceName'>;

const LoaderContainer = React.lazy(() => import('../containers/Loader'));

export function AppRoutes(): React.ReactElement {
  // The same switch that hides the masthead button, so the route it leads to
  // is not left open to anyone who knows the path. Unregistered, it falls
  // through to the catch-all below and the user lands back on the dashboard.
  const isAgentSandboxEnabled = useSelector(selectAgentSandboxEnabled);

  return (
    <Routes>
      <Route key="get-started" path={ROUTE.GET_STARTED} element={<GetStartedContainer />} />
      <Route key="workspaces-list" path={ROUTE.WORKSPACES} element={<WorkspacesListContainer />} />
      {isAgentSandboxEnabled && (
        <Route key="agent-space" path={ROUTE.AGENT_SPACE} element={<AgentSpaceContainer />} />
      )}
      <Route
        key="workspace-details"
        path={ROUTE.WORKSPACE_DETAILS}
        element={<WorkspaceDetailsContainer />}
      />
      <Route key="ide-loader" path={ROUTE.IDE_LOADER} element={<LoaderContainer />} />
      <Route
        key="restore-from-backup"
        path={ROUTE.RESTORE_FROM_BACKUP}
        element={<RestoreFromBackupContainer />}
      />
      <Route key="factory-loader" path={ROUTE.FACTORY_LOADER} element={<LoaderContainer />} />
      <Route
        key="user-preferences"
        path={ROUTE.USER_PREFERENCES}
        element={<UserPreferencesContainer />}
      />
      <Route key="redirects" path="*" element={<Redirects />} />
    </Routes>
  );
}
