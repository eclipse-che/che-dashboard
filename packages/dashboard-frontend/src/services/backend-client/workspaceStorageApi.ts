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

import {
  helpers,
  WorkspaceStorageInfo,
  WorkspaceStorageQuotaCheck,
  WorkspaceStorageResizeRequest,
  WorkspaceStorageUsage,
} from '@eclipse-che/common';

import { AxiosWrapper } from '@/services/axios-wrapper/axiosWrapper';
import { dashboardBackendPrefix } from '@/services/backend-client/const';

function getStoragePath(namespace: string, workspaceName: string): string {
  return `${dashboardBackendPrefix}/namespace/${namespace}/devworkspaces/${workspaceName}/storage`;
}

export async function getWorkspaceStorage(
  namespace: string,
  workspaceName: string,
): Promise<WorkspaceStorageInfo> {
  try {
    const response =
      await AxiosWrapper.createToRetryMissedBearerTokenError().get<WorkspaceStorageInfo>(
        getStoragePath(namespace, workspaceName),
      );
    return response.data;
  } catch (e) {
    throw new Error(`Failed to fetch the workspace storage. ${helpers.errors.getMessage(e)}`);
  }
}

export async function getWorkspaceStorageUsage(
  namespace: string,
  workspaceName: string,
): Promise<WorkspaceStorageUsage> {
  try {
    const response =
      await AxiosWrapper.createToRetryMissedBearerTokenError().get<WorkspaceStorageUsage>(
        `${getStoragePath(namespace, workspaceName)}/usage`,
      );
    return response.data;
  } catch (e) {
    throw new Error(`Failed to fetch the workspace storage usage. ${helpers.errors.getMessage(e)}`);
  }
}

export async function checkWorkspaceStorageQuota(
  namespace: string,
  workspaceName: string,
  size: string,
): Promise<WorkspaceStorageQuotaCheck> {
  try {
    const response =
      await AxiosWrapper.createToRetryMissedBearerTokenError().get<WorkspaceStorageQuotaCheck>(
        `${getStoragePath(namespace, workspaceName)}/quota`,
        { params: { size } },
      );
    return response.data;
  } catch (e) {
    throw new Error(`Failed to check the storage quota. ${helpers.errors.getMessage(e)}`);
  }
}

export async function resizeWorkspaceStorage(
  namespace: string,
  workspaceName: string,
  size: string,
): Promise<WorkspaceStorageInfo> {
  try {
    const body: WorkspaceStorageResizeRequest = { size };
    const response =
      await AxiosWrapper.createToRetryMissedBearerTokenError().patch<WorkspaceStorageInfo>(
        getStoragePath(namespace, workspaceName),
        body,
      );
    return response.data;
  } catch (e) {
    // the backend message is readable as is (quota exceeded, expansion not allowed, ...)
    throw new Error(helpers.errors.getMessage(e));
  }
}
