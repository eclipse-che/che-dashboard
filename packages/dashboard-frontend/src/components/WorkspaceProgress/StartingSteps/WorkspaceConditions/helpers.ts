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

import { WorkspaceRouteParams } from '@/Routes';
import { DEVWORKSPACE_CHE_EDITOR } from '@/services/devfileApi/devWorkspace/metadata';
import { Workspace } from '@/services/workspace-adapter';

export const EDITORS_WITH_BINARIES = [
  'che-idea-server',
  'che-clion-server',
  'che-phpstorm-server',
  'che-pycharm-server',
  'che-rider-server',
  'che-rubymine-server',
  'che-webstorm-server',
  'che-goland-server',
];

export function hasDownloadBinaries(
  allWorkspaces: Workspace[],
  matchParams: WorkspaceRouteParams,
): boolean {
  const { namespace: targetNamespace, workspaceName: targetWorkspaceName } = matchParams;
  if (!targetNamespace || !targetWorkspaceName || allWorkspaces.length === 0) {
    return false;
  }
  const targetWorkspace = allWorkspaces.find(
    w => w.name === targetWorkspaceName && w.namespace === targetNamespace,
  );
  if (!targetWorkspace) {
    return false;
  }
  const cheEditor = targetWorkspace.ref.metadata.annotations?.[DEVWORKSPACE_CHE_EDITOR];
  if (!cheEditor || cheEditor.startsWith('apiVersion') || cheEditor.startsWith('schemaVersion')) {
    return false;
  }
  const name = cheEditor.split('/')[1];
  return EDITORS_WITH_BINARIES.includes(name);
}
