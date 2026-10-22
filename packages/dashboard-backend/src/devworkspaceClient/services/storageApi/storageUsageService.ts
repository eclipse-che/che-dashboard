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

import { V1alpha2DevWorkspace } from '@devfile/api';
import { helpers, WorkspaceStorageUsage } from '@eclipse-che/common';
import * as k8s from '@kubernetes/client-node';

import { exec, ServerConfig } from '@/devworkspaceClient/services/helpers/exec';
import { StorageApiError } from '@/devworkspaceClient/services/storageApi/errors';
import {
  findProjectsContainer,
  isDevWorkspaceRunning,
  PROJECTS_MOUNT_PATH,
} from '@/devworkspaceClient/services/storageApi/pvcResolver';

// "<filesystem> <1024-blocks> <used> <available> <capacity>% <mount point>"
const DF_LINE_REGEX = /(\d+)\s+(\d+)\s+(\d+)\s+\d+%\s+\/\S*\s*$/;

/**
 * Parses the output of `df -Pk <path>` (GNU coreutils and BusyBox) into bytes.
 * @throws Error if the output can't be parsed
 */
export function parseDfOutput(output: string): WorkspaceStorageUsage {
  const match = DF_LINE_REGEX.exec(output.trim());
  if (match === null) {
    throw new Error(`Unable to parse the disk usage output: "${output.trim()}"`);
  }
  const [totalBytes, usedBytes, availableBytes] = match
    .slice(1, 4)
    .map(blocks => parseInt(blocks, 10) * 1024);
  return { totalBytes, usedBytes, availableBytes };
}

/**
 * Reads the usage of the projects volume by running `df` in the workspace container.
 */
export class StorageUsageService {
  private readonly getServerConfig: () => ServerConfig;

  constructor(userKc: k8s.KubeConfig) {
    const server = userKc.getCurrentCluster()?.server || '';
    const opts: Record<string, unknown> = {};
    userKc.applyToHTTPSOptions(opts);
    this.getServerConfig = () => ({ opts, server });
  }

  async getUsage(
    devWorkspace: V1alpha2DevWorkspace,
    pod: k8s.V1Pod | undefined,
  ): Promise<WorkspaceStorageUsage> {
    if (!isDevWorkspaceRunning(devWorkspace) || !pod?.metadata?.name) {
      throw new StorageApiError('The workspace is not running', 409);
    }
    const container = findProjectsContainer(pod);
    if (!container) {
      // e.g. a custom `sourceMapping`: a workspace configuration, not a server error
      throw new StorageApiError(`No container mounts ${PROJECTS_MOUNT_PATH}`, 409);
    }

    let stdOut: string;
    let stdError: string;
    try {
      ({ stdOut, stdError } = await exec(
        pod.metadata.name,
        pod.metadata.namespace || devWorkspace.metadata?.namespace || '',
        container.name,
        ['df', '-Pk', PROJECTS_MOUNT_PATH],
        this.getServerConfig(),
      ));
    } catch (e) {
      throw new StorageApiError(
        `Unable to read the disk usage: ${helpers.errors.getMessage(e)}`,
        500,
      );
    }

    try {
      return parseDfOutput(stdOut);
    } catch (e) {
      const details = stdError ? ` (${stdError})` : '';
      throw new StorageApiError(`${helpers.errors.getMessage(e)}${details}`, 500);
    }
  }
}
