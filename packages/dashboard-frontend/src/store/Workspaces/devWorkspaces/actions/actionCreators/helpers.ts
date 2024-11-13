/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
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

import { container } from '@/inversify.config';
import devfileApi, { isDevWorkspace } from '@/services/devfileApi';
import { devWorkspaceKind } from '@/services/devfileApi/devWorkspace';
import { compareStringsAsNumbers } from '@/services/helpers/resourceVersion';
import {
  DEVWORKSPACE_NEXT_START_ANNOTATION,
  DevWorkspaceClient,
} from '@/services/workspace-client/devworkspace/devWorkspaceClient';
import { RootState } from '@/store';
import { selectRunningWorkspacesLimit } from '@/store/ClusterConfig/selectors';
import { throwRunningWorkspacesExceededError } from '@/store/Workspaces/devWorkspaces';
import { selectRunningDevWorkspacesLimitExceeded } from '@/store/Workspaces/devWorkspaces/selectors';

/**
 * This function is used to extract an error message from an error response.
 */
export function getWarningFromResponse(e: unknown): string | undefined {
  if (!helpers.errors.includesAxiosResponse(e)) {
    return;
  }

  const response = e.response;
  const attributes = response.data.attributes;
  let provider = '';
  if (attributes !== undefined && attributes.provider !== undefined) {
    const providerAttribute: string = attributes.provider;
    if (providerAttribute.startsWith('github')) {
      provider = 'GitHub';
    } else if (providerAttribute.startsWith('gitlab')) {
      provider = 'Gitlab';
    } else if (providerAttribute.startsWith('bitbucket')) {
      provider = 'Bitbucket';
    }
  }

  if (provider.length > 0) {
    // eslint-disable-next-line no-warning-comments
    // TODO add status page url for each provider when https://github.com/eclipse-che/che/issues/23142 is fixed
    return `${provider} might not be operational, please check the provider's status page.`;
  } else {
    return response.data.message;
  }
}

/**
 * Update the DevWorkspace with the next start annotation if it exists.
 */
export async function checkDevWorkspaceNextStartAnnotation(
  devWorkspaceClient: DevWorkspaceClient,
  workspace: devfileApi.DevWorkspace,
) {
  if (workspace.metadata.annotations?.[DEVWORKSPACE_NEXT_START_ANNOTATION]) {
    const storedDevWorkspace = JSON.parse(
      workspace.metadata.annotations[DEVWORKSPACE_NEXT_START_ANNOTATION],
    ) as unknown;
    if (!isDevWorkspace(storedDevWorkspace)) {
      console.error(
        `The stored DevWorkspace either has wrong "kind" (not ${devWorkspaceKind}) or lacks some of mandatory fields: `,
        storedDevWorkspace,
      );
      throw new Error(
        'Unexpected error happened. Please check the Console tab of Developer tools.',
      );
    }

    delete workspace.metadata.annotations[DEVWORKSPACE_NEXT_START_ANNOTATION];
    workspace.spec.template = storedDevWorkspace.spec.template;
    workspace.spec.started = false;
    workspace = await devWorkspaceClient.update(workspace);
  }
}

export function checkRunningWorkspacesLimit(state: RootState) {
  const runningLimitExceeded = selectRunningDevWorkspacesLimitExceeded(state);
  if (runningLimitExceeded === false) {
    return;
  }

  const runningLimit = selectRunningWorkspacesLimit(state);
  throwRunningWorkspacesExceededError(runningLimit);
}

/**
 * Get the DevWorkspaceClient from the container. This function is used to make it easier to mock the DevWorkspaceClient in tests.
 */
export function getDevWorkspaceClient(): DevWorkspaceClient {
  return container.get(DevWorkspaceClient);
}

/**
 * Check if the devWorkspace should be updated based on the resource version. Prevents updating with older resource versions.
 */
export function shouldUpdateDevWorkspace(
  prevDevWorkspace: devfileApi.DevWorkspace | undefined,
  devWorkspace: devfileApi.DevWorkspace,
): boolean {
  const prevResourceVersion = prevDevWorkspace?.metadata.resourceVersion;
  const resourceVersion = devWorkspace.metadata.resourceVersion;
  if (resourceVersion === undefined) {
    return false;
  }

  if (prevResourceVersion === undefined) {
    return true;
  }
  if (compareStringsAsNumbers(prevResourceVersion, resourceVersion) < 0) {
    return true;
  }
  return false;
}
