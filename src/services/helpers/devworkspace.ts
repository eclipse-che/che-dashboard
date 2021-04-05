/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { devWorkspaceToDevfile, IDevWorkspace, IDevWorkspaceDevfile } from '@eclipse-che/devworkspace-client';
import { DevWorkspaceStatus, WorkspaceStatus } from './types';

/**
 * Convert a devworkspace to something that the natively dashboard understands
 * @param devworkspace The devworkspace that you want to convert
 */
export function convertDevWorkspaceV2ToV1(devworkspace: IDevWorkspace): che.Workspace {
  const convertedWorkspace = {} as che.Workspace;
  const namespace = devworkspace.metadata.namespace;
  convertedWorkspace.namespace = namespace;
  convertedWorkspace.devfile = devWorkspaceToDevfile(devworkspace);
  const epochCreatedTimestamp = new Date(devworkspace.metadata.creationTimestamp as string).valueOf();
  convertedWorkspace.attributes = {
    infrastructureNamespace: namespace,
    created: epochCreatedTimestamp.toString(),
  };
  if (devworkspace.status?.devworkspaceId) {
    convertedWorkspace.id = devworkspace.status?.devworkspaceId;
  }
  let status = devworkspace.status?.phase;
  if (status) {
    status = status.toUpperCase();
    if (status === DevWorkspaceStatus[DevWorkspaceStatus.FAILED]) {
      status = WorkspaceStatus[WorkspaceStatus.ERROR];
    }
    convertedWorkspace.status = status;
  }

  if (status && devworkspace.status?.ideUrl) {
    convertedWorkspace.runtime = {
      status,
      activeEnv: '',
      machines: {
        theia: {
          servers: {
            theia: {
              attributes: {
                type: 'ide'
              },
              url: devworkspace.status.ideUrl,
              status
            },
          },
          attributes: {},
          status
        }
      }
    };
  }
  return convertedWorkspace;
}

/**
 * Check to see if the workspace or devfile is a DevWorkspace
 * @param devworkspaceCustomResourceOrDevfile The devworkspace or devfile you want to check
 */
export function isDevWorkspace(devworkspaceCustomResourceOrDevfile: che.Workspace | api.che.workspace.devfile.Devfile | IDevWorkspaceDevfile): boolean {
  return (devworkspaceCustomResourceOrDevfile as any).kind === 'DevWorkspace' || (devworkspaceCustomResourceOrDevfile as any).devfile?.schemaVersion !== undefined || (devworkspaceCustomResourceOrDevfile as any).schemaVersion !== undefined;
}

/**
 * Check to see if the workspace is currently being deleted
 * @param workspace The workspace you want to check
 */
export function isDeleting(workspace: IDevWorkspace): boolean {
  return workspace.metadata.deletionTimestamp !== undefined;
}

/**
 * Check to see if the workspace is a web terminal
 * @param workspaceOrDevfile The workspace or devfile you want to check
 */
export function isWebTerminal(workspaceOrDevfile: che.Workspace | api.che.workspace.devfile.Devfile): boolean {
  return !!(workspaceOrDevfile as any).metadata.labels['console.openshift.io/terminal'];
}
