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

import { FastifyInstance, FastifyRequest } from 'fastify';
import { ClusterConfig } from '@eclipse-che/common';
import { baseApiPath } from '../constants/config';
import { getSchema } from '../services/helpers';
import { getDevWorkspaceClient, getServiceAccountToken } from './helper';

const tags = ['Cluster Config'];

export function registerClusterConfigApi(server: FastifyInstance) {
  server.get(
    `${baseApiPath}/cluster-config`,
    getSchema({ tags }),
    async (request: FastifyRequest) => buildClusterConfig(request),
  );
}

async function buildClusterConfig(request: FastifyRequest): Promise<ClusterConfig> {
  const token = await getServiceAccountToken(request);
  const { serverConfigApi } = await getDevWorkspaceClient(token);

  const cheCustomResource = await serverConfigApi.getCheCustomResource();
  const dashboardWarning = serverConfigApi.getDashboardWarning(cheCustomResource);
  const runningWorkspacesLimit = serverConfigApi.getRunningWorkspacesLimit(cheCustomResource);

  return { dashboardWarning, runningWorkspacesLimit };
}
