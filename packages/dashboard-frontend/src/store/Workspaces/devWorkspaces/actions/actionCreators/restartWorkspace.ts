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

import devfileApi from '@/services/devfileApi';
import { getDefer, IDeferred } from '@/services/helpers/deferred';
import { DisposableCollection } from '@/services/helpers/disposable';
import { DevWorkspaceStatus } from '@/services/helpers/types';
import { WorkspaceAdapter } from '@/services/workspace-adapter';
import { AppThunk } from '@/store';
import { actionCreators, onStatusChangeCallbacks } from '@/store/Workspaces/devWorkspaces/actions';

export const restartWorkspace =
  (workspace: devfileApi.DevWorkspace): AppThunk =>
  async dispatch => {
    const defer: IDeferred<void> = getDefer();
    const toDispose = new DisposableCollection();

    async function handleWorkspaceStatus(status: string) {
      if (status === DevWorkspaceStatus.STOPPED || status === DevWorkspaceStatus.FAILED) {
        toDispose.dispose();
        try {
          await dispatch(actionCreators.startWorkspace(workspace));
          defer.resolve();
        } catch (e) {
          defer.reject(
            new Error(`Failed to restart the workspace ${workspace.metadata.name}. ${e}`),
          );
        }
      }
    }

    if (
      workspace.status?.phase === DevWorkspaceStatus.STOPPED ||
      workspace.status?.phase === DevWorkspaceStatus.FAILED
    ) {
      await handleWorkspaceStatus(workspace.status.phase);
    } else {
      const workspaceUID = WorkspaceAdapter.getUID(workspace);
      onStatusChangeCallbacks.set(workspaceUID, handleWorkspaceStatus);
      toDispose.push({
        dispose: () => onStatusChangeCallbacks.delete(workspaceUID),
      });
      if (
        workspace.status?.phase === DevWorkspaceStatus.RUNNING ||
        workspace.status?.phase === DevWorkspaceStatus.STARTING ||
        workspace.status?.phase === DevWorkspaceStatus.FAILING
      ) {
        try {
          await dispatch(actionCreators.stopWorkspace(workspace));
        } catch (e) {
          defer.reject(
            new Error(`Failed to restart the workspace ${workspace.metadata.name}. ${e}`),
          );
        }
      }
    }

    return defer.promise;
  };
