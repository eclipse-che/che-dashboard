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

import { helpers } from '@eclipse-che/common';

import { AxiosWrapper } from '@/services/axios-wrapper/axiosWrapper';
import { dashboardBackendPrefix } from '@/services/backend-client/const';

export async function fetchAiProviderKeyStatus(namespace: string): Promise<string[]> {
  try {
    const response = await AxiosWrapper.createToRetryMissedBearerTokenError().get(
      `${dashboardBackendPrefix}/namespace/${namespace}/ai-provider-key`,
    );
    return response.data;
  } catch (e) {
    throw new Error(`Failed to fetch AI provider key status. ${helpers.errors.getMessage(e)}`);
  }
}

export async function saveAiProviderKey(
  namespace: string,
  toolId: string,
  apiKey: string,
): Promise<void> {
  try {
    const encodedKey = btoa(apiKey);
    await AxiosWrapper.createToRetryMissedBearerTokenError().post(
      `${dashboardBackendPrefix}/namespace/${namespace}/ai-provider-key`,
      { toolId, apiKey: encodedKey },
    );
  } catch (e) {
    throw new Error(`Failed to save AI provider key. ${helpers.errors.getMessage(e)}`);
  }
}

export async function deleteAiProviderKey(namespace: string, toolId: string): Promise<void> {
  try {
    await AxiosWrapper.createToRetryMissedBearerTokenError().delete(
      `${dashboardBackendPrefix}/namespace/${namespace}/ai-provider-key/${encodeURIComponent(toolId)}`,
    );
  } catch (e) {
    throw new Error(`Failed to delete AI provider key. ${helpers.errors.getMessage(e)}`);
  }
}
