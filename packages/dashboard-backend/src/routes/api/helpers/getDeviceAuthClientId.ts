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

import { prepareCoreV1API } from '@/devworkspaceClient/services/helpers/prepareCoreV1API';
import { getServiceAccountToken } from '@/routes/api/helpers/getServiceAccountToken';
import { KubeConfigProvider } from '@/services/kubeclient/kubeConfigProvider';

const DEVICE_AUTH_CONFIG_MAP = 'device-auth-config';
const GITHUB_CLIENT_ID_KEY = 'github_client_id';
const CACHE_TTL_MS = 90_000;

let cache: { value: string | null; expiresAt: number } | null = null;

/** Resets the TTL cache. For testing only. */
export function _resetCacheForTesting(): void {
  cache = null;
}

export async function getDeviceAuthClientId(): Promise<string | null> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.value;
  }

  const value = await resolveClientId();
  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

async function resolveClientId(): Promise<string | null> {
  // Local dev / CI override — avoids needing a ConfigMap in development
  if (process.env.DEVICE_AUTH_GITHUB_CLIENT_ID) {
    return process.env.DEVICE_AUTH_GITHUB_CLIENT_ID;
  }

  const namespace = process.env.CHECLUSTER_CR_NAMESPACE;
  if (!namespace) {
    return null;
  }

  try {
    const token = getServiceAccountToken();
    const kc = new KubeConfigProvider().getKubeConfig(token);
    const coreV1API = prepareCoreV1API(kc);
    const configMap = await coreV1API.readNamespacedConfigMap({
      name: DEVICE_AUTH_CONFIG_MAP,
      namespace,
    });
    const clientId = configMap.data?.[GITHUB_CLIENT_ID_KEY]?.trim() ?? '';
    return clientId || null;
  } catch {
    return null;
  }
}
