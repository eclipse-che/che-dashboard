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

import { api, helpers } from '@eclipse-che/common';
import { V1Pod } from '@kubernetes/client-node';
import { createAction } from '@reduxjs/toolkit';

import { container } from '@/inversify.config';
import { fetchPods } from '@/services/backend-client/podsApi';
import { WebsocketClient } from '@/services/backend-client/websocketClient';
import { AppThunk } from '@/store';
import { selectDefaultNamespace } from '@/store/InfrastructureNamespaces/selectors';
import { verifyAuthorized } from '@/store/SanityCheck';

/** Pod List */

export const podListRequestAction = createAction('pods/request');

type PodListReceivePayload = {
  pods: V1Pod[];
  resourceVersion: string | undefined;
};
export const podListReceiveAction = createAction<PodListReceivePayload>('pods/receive');

export const podListErrorAction = createAction<string>('pods/error');

/** Pod */

export const podReceiveAction = createAction<V1Pod>('pod/receive');
export const podModifyAction = createAction<V1Pod>('pod/modify');
export const podDeleteAction = createAction<V1Pod>('pod/delete');

export const actionCreators = {
  requestPods: (): AppThunk => async (dispatch, getState) => {
    const defaultKubernetesNamespace = selectDefaultNamespace(getState());
    const defaultNamespace = defaultKubernetesNamespace.name;

    try {
      await verifyAuthorized(dispatch, getState);

      dispatch(podListRequestAction());

      const podsList = await fetchPods(defaultNamespace);

      dispatch(
        podListReceiveAction({
          pods: podsList.items,
          resourceVersion: podsList.metadata?.resourceVersion,
        }),
      );
    } catch (e) {
      const errorMessage = 'Failed to fetch pods, reason: ' + helpers.errors.getMessage(e);
      dispatch(podListErrorAction(errorMessage));
      throw e;
    }
  },

  handleWebSocketMessage:
    (message: api.webSocket.NotificationMessage): AppThunk =>
    async (dispatch, getState) => {
      if (api.webSocket.isStatusMessage(message)) {
        const { status } = message;

        const errorMessage = `WebSocket(POD): status code ${status.code}, reason: ${status.message}`;
        console.debug(errorMessage);

        if (status.code !== 200) {
          /* in case of error status trying to fetch all pods and re-subscribe to websocket channel */

          const websocketClient = container.get(WebsocketClient);

          websocketClient.unsubscribeFromChannel(api.webSocket.Channel.POD);

          await dispatch(actionCreators.requestPods());

          const defaultKubernetesNamespace = selectDefaultNamespace(getState());
          const namespace = defaultKubernetesNamespace.name;
          const getResourceVersion = () => {
            const state = getState();
            return state.pods.resourceVersion;
          };
          websocketClient.subscribeToChannel(api.webSocket.Channel.POD, namespace, {
            getResourceVersion,
          });
        }
        return;
      }

      if (api.webSocket.isPodMessage(message)) {
        const { pod, eventPhase } = message;
        switch (eventPhase) {
          case api.webSocket.EventPhase.ADDED: {
            dispatch(podReceiveAction(pod));
            return;
          }
          case api.webSocket.EventPhase.MODIFIED: {
            dispatch(podModifyAction(pod));
            return;
          }
          case api.webSocket.EventPhase.DELETED: {
            dispatch(podDeleteAction(pod));
            return;
          }
        }
      }

      console.warn('WebSocket: unexpected message:', message);
    },
};
