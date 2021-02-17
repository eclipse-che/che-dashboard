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

import { devWorkspaceToDevfile } from '@eclipse-che/devworkspace-client';

/**
 * Convert a devworkspace to something that the natively dashboard understands
 * @param devworkspace The devworkspace that you want to convert
 */
export function convertDevWorkspaceV2ToV1(devworkspace: any): che.Workspace {
  devworkspace.namespace = devworkspace.metadata.namespace;
  devworkspace.devfile = devWorkspaceToDevfile(devworkspace);
  const epochCreatedTimestamp = new Date(devworkspace.metadata.creationTimestamp).valueOf();
  devworkspace.attributes = {
    infrastructureNamespace: devworkspace.namespace,
    created: epochCreatedTimestamp,
  };
  if (devworkspace.status.workspaceId) {
    devworkspace.id = devworkspace.status?.workspaceId;
  }
  if (devworkspace.status?.phase && devworkspace.status?.ideUrl) {
    devworkspace.runtime = {
      status: devworkspace.status.phase.toUpperCase(),
      activeEnv: '',
      machines: {
        theia: {
          servers: {
            theia: {
              attributes: {
                type: 'ide'
              },
              url: devworkspace.status.ideUrl
            }
          }
        }
      }
    };
    devworkspace.status = devworkspace.status.phase.toUpperCase();
  }
  return devworkspace;
}

/**
 * Check to see if the workspace or devfile is a DevWorkspace
 * @param devworkspaceCustomResourceOrDevfile The devworkspace or devfile you want to check
 */
export function isDevWorkspace(devworkspaceCustomResourceOrDevfile: che.Workspace | api.che.workspace.devfile.Devfile): boolean {
  return (devworkspaceCustomResourceOrDevfile as any).kind === 'DevWorkspace' || (devworkspaceCustomResourceOrDevfile as any).schemaVersion !== undefined;
}

/**
 * Check to see if the workspace is currently being deleted
 * @param workspaceOrDevfile The workspace or devfile you want to check
 */
export function isDeleting(workspaceOrDevfile: che.Workspace | api.che.workspace.devfile.Devfile): boolean {
  return (workspaceOrDevfile as any).metadata.deletionTimestamp !== undefined;
}

/**
 * Check to see if the workspace is a web terminal
 * @param workspaceOrDevfile The workspace or devfile you want to check
 */
export function isWebTerminal(workspaceOrDevfile: che.Workspace | api.che.workspace.devfile.Devfile): boolean {
  return !!(workspaceOrDevfile as any).metadata.labels['console.openshift.io/terminal'];
}

