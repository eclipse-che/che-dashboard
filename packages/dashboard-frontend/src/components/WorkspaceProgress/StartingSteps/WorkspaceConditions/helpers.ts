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

import { load } from 'js-yaml';

import { WorkspaceRouteParams } from '@/Routes';
import { DEVWORKSPACE_CHE_EDITOR } from '@/services/devfileApi/devWorkspace/metadata';
import { Workspace } from '@/services/workspace-adapter';

export const EDITORS_WITHOUT_BINARIES = ['che-code'];

function getEditorName(cheEditor: string): string | undefined {
  if (cheEditor.includes('\n')) {
    try {
      const parsed = load(cheEditor) as { metadata?: { name?: string } };
      return parsed?.metadata?.name;
    } catch {
      return undefined;
    }
  }
  return cheEditor.split('/')[1];
}

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
  if (!cheEditor) {
    return false;
  }
  const name = getEditorName(cheEditor);
  if (!name) {
    return false;
  }
  return !EDITORS_WITHOUT_BINARIES.includes(name);
}
