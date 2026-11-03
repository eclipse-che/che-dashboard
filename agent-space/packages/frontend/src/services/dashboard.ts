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

/**
 * The bits of the dashboard's own API the masthead needs.
 *
 * Every reader here answers with a fallback instead of throwing: these feed
 * optional header controls, and a cluster that does not expose them should
 * still get a usable Agent Space.
 */

const CLUSTER_INFO_URL = '/dashboard/api/cluster-info';
const USERNAME_URL = '/api/user/name';

/** Mirrors `ApplicationInfo` in `@eclipse-che/common`. */
export interface ApplicationInfo {
  url: string;
  title: string;
  icon: string;
  group?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isApplicationInfo(value: unknown): value is ApplicationInfo {
  if (!isRecord(value)) {
    return false;
  }
  const { url, title, icon } = value;
  return typeof url === 'string' && typeof title === 'string' && typeof icon === 'string';
}

/**
 * Lists the external applications the administrator linked on the CheCluster,
 * which the masthead offers under the grid icon.
 */
export async function fetchApplications(): Promise<ApplicationInfo[]> {
  try {
    const response = await fetch(CLUSTER_INFO_URL, { cache: 'no-cache' });
    if (!response.ok) {
      return [];
    }
    const raw: unknown = await response.json();
    if (!isRecord(raw) || !Array.isArray(raw['applications'])) {
      return [];
    }
    return raw['applications'].filter(isApplicationInfo);
  } catch {
    return [];
  }
}

/**
 * Reads the name of the signed-in user, shown in the masthead.
 *
 * The endpoint answers with a bare name, but some gateways wrap it in JSON
 * quotes; unwrapping keeps the masthead from reading `"kubeadmin"`.
 */
export async function fetchUsername(): Promise<string> {
  try {
    const response = await fetch(USERNAME_URL, { cache: 'no-cache' });
    if (!response.ok) {
      return '';
    }
    const body = (await response.text()).trim();
    if (body.startsWith('"') && body.endsWith('"')) {
      try {
        const parsed: unknown = JSON.parse(body);
        return typeof parsed === 'string' ? parsed : '';
      } catch {
        return body;
      }
    }
    return body;
  } catch {
    return '';
  }
}

/** Sends the browser to the sign-out endpoint, exactly as the dashboard does. */
export function signOut(): void {
  window.location.pathname = '/oauth/sign_out';
}
