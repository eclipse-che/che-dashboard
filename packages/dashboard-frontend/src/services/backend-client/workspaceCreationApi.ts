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
import devfileApi from '@/services/devfileApi';

export interface WorkspaceCreationParams {
  devfileContent?: string;
  editorContent?: string;
  editorPath?: string;
  gitBranch?: string;
  remoteUrl?: string;
}

export async function createWorkspaceViaEndpoint(
  namespace: string,
  params: WorkspaceCreationParams,
): Promise<devfileApi.DevWorkspace> {
  try {
    const response = await AxiosWrapper.createToRetryMissedBearerTokenError().post(
      `${dashboardBackendPrefix}/namespace/${namespace}/workspace-creation`,
      params,
    );
    return response.data;
  } catch (e) {
    throw new Error(
      `Failed to create workspace via endpoint. ${helpers.errors.getMessage(e)}`,
    );
  }
}
