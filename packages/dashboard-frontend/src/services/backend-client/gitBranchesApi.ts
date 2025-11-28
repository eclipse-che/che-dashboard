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

import common, { api } from '@eclipse-che/common';

import { AxiosWrapper } from '@/services/axios-wrapper/axiosWrapper';
import { dashboardBackendPrefix } from '@/services/backend-client/const';

/**
 * Returns object with git branches list.
 */
export async function fetchGitBranches(url: string): Promise<api.IGitBranches> {
  const requestUrl = `${dashboardBackendPrefix}/gitbranches/${encodeURIComponent(url)}`;
  try {
    const response =
      await AxiosWrapper.createToRetryMissedBearerTokenError().get<api.IGitBranches>(requestUrl);
    return response.data;
  } catch (e) {
    throw new Error(`Failed to fetch git branches. ${common.helpers.errors.getMessage(e)}`);
  }
}
