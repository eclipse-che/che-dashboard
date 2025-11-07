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

import { WorkspaceRouteParams } from '@/Routes';
import { DEVWORKSPACE_CHE_EDITOR } from '@/services/devfileApi/devWorkspace/metadata';
import { Workspace } from '@/services/workspace-adapter';

export const EDITORS_WITHOUT_BINARIES = ['che-code'];

export function hasDownloadBinaries(
  allWorkspaces: Workspace[],
  matchParams: WorkspaceRouteParams,
): boolean {
  const { namespace: targetNamespace, workspaceName: targetWorkspaceName } = matchParams;
  // skip if target namespace or workspace name is empty or workspaces list is empty
  if (!targetNamespace || !targetWorkspaceName || allWorkspaces.length === 0) {
    return false;
  }
  // find target workspace
  const targetWorkspace = allWorkspaces.find(
    w => w.name === targetWorkspaceName && w.namespace === targetNamespace,
  );
  // skip if no target workspace found
  if (!targetWorkspace) {
    return false;
  }
  const cheEditor = targetWorkspace.ref.metadata.annotations?.[DEVWORKSPACE_CHE_EDITOR];
  // skip if editor annotation empty or contains the devfile content
  if (!cheEditor || cheEditor.startsWith('apiVersion') || cheEditor.startsWith('schemaVersion')) {
    return false;
  }
  // extract editor name from annotation
  const name = cheEditor.split('/')[1];
  // check if editor is in the list of editors without binaries
  return !EDITORS_WITHOUT_BINARIES.includes(name);
}
