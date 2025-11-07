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

import common from '@eclipse-che/common';

import { DEVWORKSPACE_UPDATING_TIMESTAMP_ANNOTATION } from '@/services/devfileApi/devWorkspace/metadata';
import { AppThunk } from '@/store';
import { selectDefaultNamespace } from '@/store/InfrastructureNamespaces';
import { verifyAuthorized } from '@/store/SanityCheck';
import { actionCreators } from '@/store/Workspaces/devWorkspaces/actions';
import { getDevWorkspaceClient } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers';
import {
  devWorkspacesErrorAction,
  devWorkspacesReceiveAction,
  devWorkspacesRequestAction,
  devWorkspacesUpdateStartedAction,
} from '@/store/Workspaces/devWorkspaces/actions/actions';

export const requestWorkspaces = (): AppThunk => async (dispatch, getState) => {
  try {
    await verifyAuthorized(dispatch, getState);

    dispatch(devWorkspacesRequestAction());

    const defaultKubernetesNamespace = selectDefaultNamespace(getState());
    const defaultNamespace = defaultKubernetesNamespace.name;
    const { workspaces, resourceVersion } = defaultNamespace
      ? await getDevWorkspaceClient().getAllWorkspaces(defaultNamespace)
      : {
          workspaces: [],
          resourceVersion: '',
        };

    dispatch(devWorkspacesReceiveAction({ workspaces, resourceVersion }));
    dispatch(devWorkspacesUpdateStartedAction(workspaces));

    const promises = workspaces
      .filter(
        workspace =>
          workspace.metadata.annotations?.[DEVWORKSPACE_UPDATING_TIMESTAMP_ANNOTATION] ===
          undefined,
      )
      .map(async workspace => {
        // this will set updating timestamp to annotations and update the workspace
        await dispatch(actionCreators.updateWorkspace(workspace));
      });
    await Promise.allSettled(promises);
  } catch (e) {
    const errorMessage =
      'Failed to fetch available workspaces, reason: ' + common.helpers.errors.getMessage(e);
    dispatch(devWorkspacesErrorAction(errorMessage));
    throw e;
  }
};
