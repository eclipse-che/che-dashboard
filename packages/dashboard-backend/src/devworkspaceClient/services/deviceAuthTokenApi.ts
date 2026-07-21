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

import { api } from '@eclipse-che/common';
import * as k8s from '@kubernetes/client-node';
import { randomBytes } from 'crypto';

import { createError } from '@/devworkspaceClient/services/helpers/createError';
import {
  CoreV1API,
  prepareCoreV1API,
} from '@/devworkspaceClient/services/helpers/prepareCoreV1API';
import {
  DeviceAuthPollResult,
  DeviceCodeResponse,
  IDeviceAuthTokenApi,
} from '@/devworkspaceClient/types';

const API_ERROR_LABEL = 'CORE_V1_API_ERROR';

const DEVICE_AUTH_LABEL = 'che.eclipse.org/device-authentication';
const DEVICE_AUTH_LABEL_SELECTOR = `${DEVICE_AUTH_LABEL}=true`;
const DEVICE_AUTH_PROVIDER_LABEL = 'che.eclipse.org/device-authentication-provider';

const GITHUB_SCOPES = 'read:user repo user:email workflow';
const GITHUB_API_TIMEOUT_MS = 30_000;

interface GitHubDeviceCodeResponse {
  device_code?: string;
  user_code?: string;
  verification_uri?: string;
  interval?: number;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface GitHubTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

function getGitHubClientId(): string {
  const clientId = process.env.CHE_GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error('CHE_GITHUB_OAUTH_CLIENT_ID environment variable is not set');
  }
  return clientId;
}

async function githubPostDeviceCode(
  params: Record<string, string>,
): Promise<GitHubDeviceCodeResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GITHUB_API_TIMEOUT_MS);
  try {
    const query = new URLSearchParams(params).toString();
    const url = `https://github.com/login/device/code?${query}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`GitHub API returned HTTP ${response.status}`);
    }
    const data: unknown = await response.json();
    return data as GitHubDeviceCodeResponse;
  } finally {
    clearTimeout(timer);
  }
}

async function githubPostToken(params: Record<string, string>): Promise<GitHubTokenResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GITHUB_API_TIMEOUT_MS);
  try {
    const query = new URLSearchParams(params).toString();
    const url = `https://github.com/login/oauth/access_token?${query}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`GitHub API returned HTTP ${response.status}`);
    }
    const data: unknown = await response.json();
    return data as GitHubTokenResponse;
  } finally {
    clearTimeout(timer);
  }
}

export class DeviceAuthTokenApiService implements IDeviceAuthTokenApi {
  private readonly coreV1API: CoreV1API;

  constructor(kc: k8s.KubeConfig) {
    this.coreV1API = prepareCoreV1API(kc);
  }

  async listTokens(namespace: string): Promise<api.DeviceAuthToken[]> {
    try {
      const resp = await this.coreV1API.listNamespacedSecret({
        namespace,
        labelSelector: DEVICE_AUTH_LABEL_SELECTOR,
      });
      const tokens = resp.items.filter(secret => !!secret.metadata?.name);
      return Promise.all(
        tokens.map(async secret => {
          const rawToken = Buffer.from(secret.data?.['token'] ?? '', 'base64').toString('utf-8');
          let valid: boolean | undefined;
          if (rawToken) {
            valid = await this.checkTokenValidity(rawToken);
          }
          return {
            name: secret.metadata?.name ?? '',
            provider: secret.metadata?.labels?.[DEVICE_AUTH_PROVIDER_LABEL],
            creationTimestamp: secret.metadata?.creationTimestamp?.toISOString(),
            valid,
          };
        }),
      );
    } catch (error) {
      const additionalMessage = `Unable to list Device Authentication tokens in the namespace "${namespace}"`;
      throw createError(error, API_ERROR_LABEL, additionalMessage);
    }
  }

  private async checkTokenValidity(token: string): Promise<boolean | undefined> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
        },
        signal: controller.signal,
      });
      return response.ok;
    } catch {
      return undefined;
    } finally {
      clearTimeout(timer);
    }
  }

  async deleteToken(namespace: string, tokenName: string): Promise<void> {
    const additionalMessage = `Unable to delete Device Authentication token "${tokenName}" in the namespace "${namespace}"`;

    let secret: k8s.V1Secret;
    try {
      secret = await this.coreV1API.readNamespacedSecret({ name: tokenName, namespace });
    } catch (error) {
      throw createError(error, API_ERROR_LABEL, additionalMessage);
    }

    if (secret.metadata?.labels?.[DEVICE_AUTH_LABEL] !== 'true') {
      throw new Error(
        `Secret "${tokenName}" does not carry the ${DEVICE_AUTH_LABEL_SELECTOR} label`,
      );
    }

    // Best-effort GitHub token revocation via POST /credentials/revoke.
    // This endpoint requires NO app credentials — works for any gho_/ghp_ token.
    // The token owner receives a GitHub notification email upon revocation.
    // See: https://docs.github.com/en/rest/credentials/revoke
    const rawToken = Buffer.from(secret.data?.['token'] ?? '', 'base64').toString('utf-8');
    if (rawToken) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), GITHUB_API_TIMEOUT_MS);
        try {
          const revokeResponse = await fetch('https://api.github.com/credentials/revoke', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
            body: JSON.stringify({ credentials: [rawToken] }),
            signal: controller.signal,
          });
          if (!revokeResponse.ok && revokeResponse.status !== 202) {
            console.warn(
              `[device-auth] GitHub token revocation failed (HTTP ${revokeResponse.status}).`,
            );
          }
        } finally {
          clearTimeout(timer);
        }
      } catch (e) {
        console.warn(`[device-auth] GitHub token revocation error: ${e}`);
      }
    }

    try {
      await this.coreV1API.deleteNamespacedSecret({
        name: tokenName,
        namespace,
        body: { preconditions: { resourceVersion: secret.metadata?.resourceVersion } },
      });
    } catch (error) {
      throw createError(error, API_ERROR_LABEL, additionalMessage);
    }
  }

  async initiateDeviceAuth(): Promise<DeviceCodeResponse> {
    const clientId = getGitHubClientId();
    const data = await githubPostDeviceCode({
      client_id: clientId,
      scope: GITHUB_SCOPES,
    });
    if (!data.device_code || !data.user_code || !data.verification_uri) {
      if (data.error === 'device_flow_disabled' || data.error === 'device_flow_not_enabled') {
        throw new Error(
          'Device Flow is not enabled for this GitHub OAuth App. ' +
            'An administrator must enable it at GitHub Settings → Developer settings → OAuth Apps.',
        );
      }
      throw new Error(
        `Failed to initiate device auth: ${data.error_description ?? JSON.stringify(data)}`,
      );
    }
    return {
      deviceCode: data.device_code,
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      interval: data.interval ?? 5,
    };
  }

  async pollDeviceAuth(namespace: string, deviceCode: string): Promise<DeviceAuthPollResult> {
    const clientId = getGitHubClientId();
    const data = await githubPostToken({
      client_id: clientId,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    });

    if (data.error === 'authorization_pending') {
      return { status: 'pending' };
    }
    if (data.error === 'slow_down') {
      return { status: 'slow_down' };
    }
    if (data.error === 'expired_token') {
      return { status: 'expired' };
    }
    if (data.error) {
      return { status: 'error', message: data.error_description ?? data.error };
    }
    if (!data.access_token) {
      return { status: 'error', message: 'No access_token in response' };
    }

    const token = await this.createDeviceAuthSecret(namespace, data.access_token);
    return { status: 'authorized', token };
  }

  private async createDeviceAuthSecret(
    namespace: string,
    accessToken: string,
  ): Promise<api.DeviceAuthToken> {
    const tokenData = Buffer.from(accessToken).toString('base64');

    // Match che-code's single-active-token approach: replace existing secret if present
    const existing = await this.coreV1API.listNamespacedSecret({
      namespace,
      labelSelector: DEVICE_AUTH_LABEL_SELECTOR,
    });
    if (existing.items.length > 0 && existing.items[0].metadata?.name) {
      const existingName = existing.items[0].metadata.name;
      const updated = await this.coreV1API.replaceNamespacedSecret({
        name: existingName,
        namespace,
        body: {
          metadata: {
            name: existingName,
            namespace,
            labels: {
              [DEVICE_AUTH_LABEL]: 'true',
              [DEVICE_AUTH_PROVIDER_LABEL]: 'github',
            },
          },
          data: { token: tokenData },
        },
      });
      return {
        name: existingName,
        provider: 'github',
        creationTimestamp: updated.metadata?.creationTimestamp?.toISOString(),
      };
    }

    const name = `device-authentication-secret-${randomBytes(6).toString('hex')}`;
    const created = await this.coreV1API.createNamespacedSecret({
      namespace,
      body: {
        metadata: {
          name,
          namespace,
          labels: {
            [DEVICE_AUTH_LABEL]: 'true',
            [DEVICE_AUTH_PROVIDER_LABEL]: 'github',
          },
        },
        data: { token: tokenData },
      },
    });
    return {
      name,
      provider: 'github',
      creationTimestamp: created.metadata?.creationTimestamp?.toISOString(),
    };
  }
}
