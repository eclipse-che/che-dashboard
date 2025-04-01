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

import { WantDelete } from '@/contexts/WorkspaceActions/index';
import { Workspace } from '@/services/workspace-adapter';

export function hasDeleteWarning(allWorkspaces: Workspace[], wantDelete: WantDelete): boolean {
  const hasPerUserWorkspaceToDelete =
    allWorkspaces.find(
      workspace =>
        wantDelete.indexOf(workspace.name) !== -1 && workspace.storageType === 'per-user',
    ) !== undefined;

  const hasRunningPerUserWorkspace =
    allWorkspaces.find(
      workspace =>
        wantDelete.indexOf(workspace.name) === -1 &&
        workspace.storageType === 'per-user' &&
        (workspace.isStarting || workspace.isRunning || workspace.isStopping),
    ) !== undefined;

  return hasPerUserWorkspaceToDelete && hasRunningPerUserWorkspace;
}
