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

import { api } from '@eclipse-che/common';

import { container } from '@/inversify.config';
import { injectKubeConfig, podmanLogin } from '@/services/backend-client/devWorkspaceApi';
import { WebsocketClient } from '@/services/backend-client/websocketClient';
import devfileApi, { isDevWorkspace } from '@/services/devfileApi';
import { DevWorkspaceStatus } from '@/services/helpers/types';
import { WorkspaceAdapter } from '@/services/workspace-adapter';
import { AppThunk } from '@/store';
import { selectDefaultNamespace } from '@/store/InfrastructureNamespaces';
import {
  actionCreators,
  onStatusChangeCallbacks,
} from '@/store/Workspaces/devWorkspaces/actions/actionCreators';
import { shouldUpdateDevWorkspace } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers';
import {
  devWorkspacesAddAction,
  devWorkspacesDeleteAction,
  devWorkspacesUpdateAction,
  devWorkspacesUpdateStartedAction,
} from '@/store/Workspaces/devWorkspaces/actions/actions';

export const handleWebSocketMessage =
  (message: api.webSocket.NotificationMessage): AppThunk =>
  async (dispatch, getState) => {
    if (api.webSocket.isStatusMessage(message)) {
      const { status } = message;

      const errorMessage = `WebSocket(DEV_WORKSPACE): status code ${status.code}, reason: ${status.message}`;
      console.debug(errorMessage);

      if (status.code !== 200) {
        /* in case of error status trying to fetch all devWorkspaces and re-subscribe to websocket channel */

        const websocketClient = container.get(WebsocketClient);

        websocketClient.unsubscribeFromChannel(api.webSocket.Channel.DEV_WORKSPACE);

        await dispatch(actionCreators.requestWorkspaces());

        const defaultKubernetesNamespace = selectDefaultNamespace(getState());
        const namespace = defaultKubernetesNamespace.name;
        const getResourceVersion = () => {
          const state = getState();
          return state.devWorkspaces.resourceVersion;
        };
        websocketClient.subscribeToChannel(api.webSocket.Channel.DEV_WORKSPACE, namespace, {
          getResourceVersion,
        });
      }
      return;
    }

    if (api.webSocket.isDevWorkspaceMessage(message)) {
      const { eventPhase, devWorkspace } = message;

      if (isDevWorkspace(devWorkspace) === false) {
        return;
      }

      const workspace = devWorkspace as devfileApi.DevWorkspace;

      // previous state of the workspace is needed for notifying about workspace status changes.
      const prevWorkspace = getState().devWorkspaces.workspaces.find(
        w => WorkspaceAdapter.getId(w) === WorkspaceAdapter.getId(workspace),
      );

      // update the workspace in the store
      switch (eventPhase) {
        case api.webSocket.EventPhase.ADDED:
          dispatch(devWorkspacesAddAction(workspace));
          break;
        case api.webSocket.EventPhase.MODIFIED:
          // update workspace only if it has newer resource version
          if (shouldUpdateDevWorkspace(prevWorkspace, workspace)) {
            dispatch(devWorkspacesUpdateAction(workspace));
          }
          break;
        case api.webSocket.EventPhase.DELETED:
          dispatch(devWorkspacesDeleteAction(workspace));
          break;
        default:
          console.warn(`Unknown event phase in message: `, message);
      }
      if (shouldUpdateDevWorkspace(prevWorkspace, workspace)) {
        // store workspace status only if the workspace has newer resource version
        dispatch(devWorkspacesUpdateStartedAction([workspace]));
      }

      // notify about workspace status changes
      const devworkspaceId = workspace.status?.devworkspaceId;
      const phase = workspace.status?.phase;
      const prevPhase = prevWorkspace?.status?.phase;
      const workspaceUID = WorkspaceAdapter.getUID(workspace);
      if (shouldUpdateDevWorkspace(prevWorkspace, workspace) && phase && prevPhase !== phase) {
        // notify about workspace status changes only if the workspace has newer resource version
        const onStatusChangeListener = onStatusChangeCallbacks.get(workspaceUID);

        if (onStatusChangeListener) {
          onStatusChangeListener(phase);
        }
      }

      if (
        phase === DevWorkspaceStatus.RUNNING &&
        phase !== prevPhase &&
        devworkspaceId !== undefined
      ) {
        try {
          // inject the kube config
          await injectKubeConfig(workspace.metadata.namespace, devworkspaceId);
          // inject the 'podman login'
          await podmanLogin(workspace.metadata.namespace, devworkspaceId);
        } catch (e) {
          console.error(e);
        }
      }
    }
  };
