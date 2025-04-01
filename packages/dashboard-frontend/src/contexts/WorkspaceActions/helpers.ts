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
import { WorkspaceStorageType } from '@/services/models/che';
import { Workspace } from '@/services/workspace-adapter';

export function hasDeleteWarning(
  allWorkspaces: Workspace[],
  wantDelete: WantDelete,
  defaultPvcStrategy: WorkspaceStorageType = '',
): boolean {
  const isPerUserStorageType = (workspace: Workspace) => {
    const storageType = workspace.storageType ? workspace.storageType : defaultPvcStrategy;
    return storageType === 'per-user';
  };

  const perUserWorkspaceToDelete = allWorkspaces.filter(
    workspace => wantDelete.indexOf(workspace.name) !== -1 && isPerUserStorageType(workspace),
  );

  const hasPerUserWorkspaceToDelete = perUserWorkspaceToDelete.length > 0;

  const moreThanOneRunningPerUserWorkspaceToDelete =
    perUserWorkspaceToDelete.filter(
      workspace => workspace.isStarting || workspace.isRunning || workspace.isStopping,
    ).length > 1;

  const hasRunningPerUserWorkspace =
    allWorkspaces.find(
      workspace =>
        wantDelete.indexOf(workspace.name) === -1 &&
        isPerUserStorageType(workspace) &&
        (workspace.isStarting || workspace.isRunning || workspace.isStopping),
    ) !== undefined;

  return (
    moreThanOneRunningPerUserWorkspaceToDelete ||
    (hasPerUserWorkspaceToDelete && hasRunningPerUserWorkspace)
  );
}
