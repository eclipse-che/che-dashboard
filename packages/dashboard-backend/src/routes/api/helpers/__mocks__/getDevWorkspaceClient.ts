/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { DevWorkspaceClient, IServerConfigApi } from '../../../../devworkspace-client';
import { getDevWorkspaceClient as helper } from '../getDevWorkspaceClient';

export const stubDashboardWarning = 'Dashboard warning';
export const stubRunningWorkspacesLimit = 2;

export function getDevWorkspaceClient(args: Parameters<typeof helper>): ReturnType<typeof helper> {
  return {
    serverConfigApi: {
      getCheCustomResource: () => ({}),
      getDashboardWarning: _cheCustomResource => stubDashboardWarning,
      getRunningWorkspacesLimit: _cheCustomResource => stubRunningWorkspacesLimit,
    } as IServerConfigApi,
  } as DevWorkspaceClient;
}
