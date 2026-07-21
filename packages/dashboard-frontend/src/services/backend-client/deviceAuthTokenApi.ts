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

import { api, helpers } from '@eclipse-che/common';

export type DeviceCodeResponse = api.DeviceCodeResponse;
export type DeviceAuthPollResult = api.DeviceAuthPollResult;

import { AxiosWrapper } from '@/services/axios-wrapper/axiosWrapper';
import { dashboardBackendPrefix } from '@/services/backend-client/const';

export async function fetchDeviceAuthTokens(namespace: string): Promise<api.DeviceAuthToken[]> {
  try {
    const response = await AxiosWrapper.createToRetryMissedBearerTokenError().get(
      `${dashboardBackendPrefix}/namespace/${namespace}/device-auth-token`,
    );
    return response.data;
  } catch (e) {
    throw new Error(
      `Failed to fetch Device Authentication tokens. ${helpers.errors.getMessage(e)}`,
    );
  }
}

export async function deleteDeviceAuthToken(namespace: string, tokenName: string): Promise<void> {
  try {
    await AxiosWrapper.createToRetryMissedBearerTokenError().delete(
      `${dashboardBackendPrefix}/namespace/${namespace}/device-auth-token/${encodeURIComponent(tokenName)}`,
    );
  } catch (e) {
    throw new Error(
      `Failed to delete Device Authentication token. ${helpers.errors.getMessage(e)}`,
    );
  }
}

export async function initiateDeviceAuth(namespace: string): Promise<DeviceCodeResponse> {
  try {
    const response = await AxiosWrapper.createToRetryMissedBearerTokenError().post(
      `${dashboardBackendPrefix}/namespace/${namespace}/device-auth-token/initiate`,
    );
    return response.data;
  } catch (e) {
    throw new Error(`Failed to initiate Device Authentication. ${helpers.errors.getMessage(e)}`);
  }
}

export async function pollDeviceAuth(
  namespace: string,
  deviceCode: string,
): Promise<DeviceAuthPollResult> {
  try {
    const response = await AxiosWrapper.createToRetryMissedBearerTokenError().post(
      `${dashboardBackendPrefix}/namespace/${namespace}/device-auth-token/poll`,
      { deviceCode },
    );
    return response.data;
  } catch (e) {
    throw new Error(`Failed to poll Device Authentication. ${helpers.errors.getMessage(e)}`);
  }
}

export async function validateDeviceAuthToken(
  namespace: string,
  tokenName: string,
): Promise<boolean | undefined> {
  try {
    const response = await AxiosWrapper.createToRetryMissedBearerTokenError().get(
      `${dashboardBackendPrefix}/namespace/${namespace}/device-auth-token/${encodeURIComponent(tokenName)}/validate`,
    );
    const { valid } = response.data as { valid: boolean | null };
    return valid ?? undefined;
  } catch {
    return undefined;
  }
}
