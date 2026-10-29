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
 * Runtime configuration, read from `config.json` next to the bundle so a
 * deployment can be re-pointed without rebuilding the application.
 */
export interface AgentSpaceConfig {
  /**
   * - `cluster` always talks to the dashboard backend,
   * - `mock` always uses the in-memory client,
   * - `auto` probes the Sandbox API once and falls back to `mock`.
   */
  mode: 'auto' | 'cluster' | 'mock';
  /** Origin in front of `/dashboard/api/...`; empty means same-origin. */
  kubeApiBaseUrl: string;
  /** Namespace to work in. Empty means "resolve at startup". */
  namespace: string;
  samplesIndexUrl: string;
  /** Where the "Workspaces" button sends the user back to. */
  dashboardUrl: string;
}

export const DEFAULT_CONFIG: AgentSpaceConfig = {
  mode: 'auto',
  kubeApiBaseUrl: '',
  namespace: '',
  samplesIndexUrl: './registry/sandbox/index.json',
  dashboardUrl: '../#/workspaces',
};

const CONFIG_URL = './config.json';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function pickString(raw: Record<string, unknown>, key: string, fallback: string): string {
  const value = raw[key];
  return typeof value === 'string' ? value : fallback;
}

function pickMode(raw: Record<string, unknown>): AgentSpaceConfig['mode'] {
  const value = raw['mode'];
  return value === 'cluster' || value === 'mock' || value === 'auto' ? value : DEFAULT_CONFIG.mode;
}

export function normalizeConfig(raw: unknown): AgentSpaceConfig {
  if (!isRecord(raw)) {
    return { ...DEFAULT_CONFIG };
  }

  return {
    mode: pickMode(raw),
    kubeApiBaseUrl: pickString(raw, 'kubeApiBaseUrl', DEFAULT_CONFIG.kubeApiBaseUrl).replace(
      /\/$/,
      '',
    ),
    namespace: pickString(raw, 'namespace', DEFAULT_CONFIG.namespace),
    samplesIndexUrl: pickString(raw, 'samplesIndexUrl', DEFAULT_CONFIG.samplesIndexUrl),
    dashboardUrl: pickString(raw, 'dashboardUrl', DEFAULT_CONFIG.dashboardUrl),
  };
}

/**
 * `?mode=mock` wins over config.json. It is the quickest way to demo the UI
 * against a cluster that does not have the agent-sandbox controller installed.
 */
export function applyUrlOverrides(
  config: AgentSpaceConfig,
  search = window.location.search,
): AgentSpaceConfig {
  const params = new URLSearchParams(search);
  const mode = params.get('mode');
  const namespace = params.get('namespace');

  return {
    ...config,
    mode: mode === 'cluster' || mode === 'mock' || mode === 'auto' ? mode : config.mode,
    namespace: namespace || config.namespace,
  };
}

/**
 * Points at another route of the dashboard's own SPA, reusing whatever entry
 * point `dashboardUrl` was configured with so a relocated dashboard is still
 * reached correctly.
 */
export function dashboardRoute(dashboardUrl: string, route: string): string {
  const [base] = dashboardUrl.split('#');
  return `${base}#${route}`;
}

export async function loadConfig(): Promise<AgentSpaceConfig> {
  try {
    const response = await fetch(CONFIG_URL, { cache: 'no-cache' });
    if (!response.ok) {
      return applyUrlOverrides({ ...DEFAULT_CONFIG });
    }
    return applyUrlOverrides(normalizeConfig(await response.json()));
  } catch {
    // Missing config.json is expected in tests and in some dev setups.
    return applyUrlOverrides({ ...DEFAULT_CONFIG });
  }
}
