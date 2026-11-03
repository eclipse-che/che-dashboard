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

import { Sandbox, SANDBOX_API_VERSION_FULL, SANDBOX_KIND } from '@/services/types';

/** Where the dashboard backend is mounted; see `baseApiPath` in the backend. */
const CLUSTER_INFO_URL = '/dashboard/api/cluster-info';

/**
 * The application the dashboard publishes for the cluster console. Mirrors
 * `ApplicationId.CLUSTER_CONSOLE` of `@eclipse-che/common`, which this bundle
 * does not depend on.
 */
const CLUSTER_CONSOLE_ID = 'cluster-console';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * The console URL out of a `/cluster-info` payload, if the cluster has one.
 *
 * The dashboard only publishes the application when `OPENSHIFT_CONSOLE_URL` is
 * set, so a plain Kubernetes cluster answers with an empty list.
 */
export function pickClusterConsoleUrl(payload: unknown): string {
  if (!isRecord(payload) || !Array.isArray(payload.applications)) {
    return '';
  }

  const application = payload.applications
    .filter(isRecord)
    .find(entry => entry.id === CLUSTER_CONSOLE_ID);

  return typeof application?.url === 'string' ? application.url.replace(/\/$/, '') : '';
}

/**
 * Asks the dashboard backend where the cluster console lives.
 *
 * Best effort: Agent Space also runs beside no dashboard at all, and a sandbox
 * page without the console link is worth more than a bootstrap that failed.
 */
export async function fetchClusterConsoleUrl(baseUrl = ''): Promise<string> {
  try {
    const response = await fetch(`${baseUrl}${CLUSTER_INFO_URL}`, { cache: 'no-cache' });
    if (!response.ok) {
      return '';
    }
    return pickClusterConsoleUrl(await response.json());
  } catch {
    return '';
  }
}

/**
 * Where the console shows a sandbox, the way the workspace details page links
 * a DevWorkspace. Empty when the cluster publishes no console.
 */
export function buildSandboxConsoleUrl(clusterConsoleUrl: string, sandbox: Sandbox): string {
  const { name, namespace } = sandbox.metadata;
  if (!clusterConsoleUrl || !name || !namespace) {
    return '';
  }

  const apiVersion = sandbox.apiVersion || SANDBOX_API_VERSION_FULL;
  const kind = sandbox.kind || SANDBOX_KIND;
  const resourcePath = `${apiVersion.replace('/', '~')}~${kind}`;

  return `${clusterConsoleUrl}/k8s/ns/${namespace}/${resourcePath}/${name}`;
}
