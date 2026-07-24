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

import { ClusterConfig } from '@eclipse-che/common';
import { FastifyInstance } from 'fastify';

import { baseApiPath } from '@/constants/config';
import { getDevWorkspaceClient } from '@/routes/api/helpers/getDevWorkspaceClient';
import { getServiceAccountToken } from '@/routes/api/helpers/getServiceAccountToken';
import { getSchema } from '@/services/helpers';

const tags = ['Cluster Config'];

export function registerClusterConfigRoute(instance: FastifyInstance) {
  instance.register(async server => {
    server.get(`${baseApiPath}/cluster-config`, getSchema({ tags }), async () =>
      buildClusterConfig(),
    );
  });
}

/**
 * Determines whether GitHub OAuth is configured by calling the Che Server's
 * /api/oauth endpoint with the dashboard SA token — the same source the
 * Git Services tab uses. No RBAC changes or env vars required.
 * Falls back to CHE_GITHUB_OAUTH_CLIENT_ID env var for local dev / override.
 */
async function isGitHubOAuthConfigured(): Promise<boolean> {
  if (process.env.CHE_GITHUB_OAUTH_CLIENT_ID) {
    return true;
  }
  const cheInternalUrl = process.env.CHE_INTERNAL_URL;
  if (!cheInternalUrl) {
    return false;
  }
  try {
    const saToken = getServiceAccountToken();
    const response = await fetch(`${cheInternalUrl}/oauth`, {
      headers: { Authorization: `Bearer ${saToken}` },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      return false;
    }
    const providers = (await response.json()) as Array<{ name: string }>;
    return Array.isArray(providers) && providers.some(p => p.name === 'github');
  } catch {
    return false;
  }
}

async function buildClusterConfig(): Promise<ClusterConfig> {
  const token = getServiceAccountToken();
  const { serverConfigApi } = getDevWorkspaceClient(token);

  const cheCustomResource = await serverConfigApi.fetchCheCustomResource();
  const dashboardWarning = serverConfigApi.getDashboardWarning(cheCustomResource);
  const runningWorkspacesLimit = serverConfigApi.getRunningWorkspacesLimit(cheCustomResource);
  const allWorkspacesLimit = serverConfigApi.getAllWorkspacesLimit(cheCustomResource);
  const dashboardFavicon = serverConfigApi.getDashboardLogo(cheCustomResource);
  const currentArchitecture = await serverConfigApi.getCurrentArchitecture();

  return {
    dashboardWarning,
    dashboardFavicon,
    allWorkspacesLimit,
    runningWorkspacesLimit,
    currentArchitecture,
    githubDeviceAuthEnabled: await isGitHubOAuthConfigured(),
  };
}
