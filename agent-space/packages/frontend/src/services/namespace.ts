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

import { AgentSpaceConfig } from '@/services/config';
import { AgentSandboxClient } from '@/services/types';

/**
 * Che provisions one namespace per user and the dashboard backend exposes it
 * here. Agent Space is served from the same origin, so it can reuse it instead
 * of asking the user which namespace to work in.
 */
const CHE_NAMESPACE_URL = '/api/kubernetes/namespace';

export const FALLBACK_NAMESPACE = 'default';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Picks the default namespace out of the Che response. Che marks it with the
 * `phase: 'ACTIVE'` attribute; the first entry is used when nothing is marked.
 */
export function pickCheNamespace(payload: unknown): string | undefined {
  if (!Array.isArray(payload) || payload.length === 0) {
    return undefined;
  }

  const names = payload
    .filter(isRecord)
    .map(entry => ({
      name: typeof entry['name'] === 'string' ? entry['name'] : undefined,
      active: isRecord(entry['attributes']) && entry['attributes']['phase'] === 'ACTIVE',
    }))
    .filter((entry): entry is { name: string; active: boolean } => entry.name !== undefined);

  return (names.find(entry => entry.active) ?? names[0])?.name;
}

async function fetchCheNamespace(): Promise<string | undefined> {
  try {
    const response = await fetch(CHE_NAMESPACE_URL, { cache: 'no-cache' });
    if (!response.ok) {
      return undefined;
    }
    return pickCheNamespace(await response.json());
  } catch {
    // Standalone deployments are not served next to a Che server.
    return undefined;
  }
}

/**
 * Resolution order: explicit configuration or `?namespace=` wins, then the Che
 * user namespace, then whatever the cluster lets us list, then `default`.
 */
export async function resolveNamespace(
  config: AgentSpaceConfig,
  client: AgentSandboxClient,
): Promise<string> {
  if (config.namespace) {
    return config.namespace;
  }

  const cheNamespace = await fetchCheNamespace();
  if (cheNamespace) {
    return cheNamespace;
  }

  const namespaces = await client.listNamespaces();
  return namespaces[0] ?? FALLBACK_NAMESPACE;
}
