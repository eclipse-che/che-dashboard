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
import { V1Pod } from '@kubernetes/client-node';
import { createAction } from '@reduxjs/toolkit';

import { container } from '@/inversify.config';
import { WebsocketClient } from '@/services/backend-client/websocketClient';
import { ChannelListener } from '@/services/backend-client/websocketClient/messageHandler';
import { AppThunk } from '@/store';
import { selectDefaultNamespace } from '@/store/InfrastructureNamespaces/selectors';
import { selectAllPods } from '@/store/Pods/selectors';

type PodLogsReceivePayload = {
  podName: string;
  containerName: string;
  logs: string;
  failure: boolean;
};
export const podLogsReceiveAction = createAction<PodLogsReceivePayload>('podLogs/receive');

export const podLogsDeleteAction = createAction<string>('podLogs/delete');

export const actionCreators = {
  watchPodLogs:
    (pod: V1Pod): AppThunk =>
    async (dispatch, getState) => {
      const podName = pod.metadata?.name;
      if (podName === undefined) {
        console.warn(`Can't watch pod logs: pod name is undefined.`, pod);
        throw new Error(`Can't watch pod logs: pod name is undefined`);
      }

      const defaultKubernetesNamespace = selectDefaultNamespace(getState());
      const namespace = defaultKubernetesNamespace.name;

      const websocketClient = container.get(WebsocketClient);
      await websocketClient.connect();

      if (websocketClient.hasChannelMessageListener(api.webSocket.Channel.LOGS) === false) {
        const listener: ChannelListener = message =>
          dispatch(actionCreators.handleWebSocketMessage(message));
        websocketClient.addChannelMessageListener(api.webSocket.Channel.LOGS, listener);
      }

      websocketClient.unsubscribeFromChannel(api.webSocket.Channel.LOGS);
      websocketClient.subscribeToChannel(api.webSocket.Channel.LOGS, namespace, {
        podName,
      });
    },

  stopWatchingPodLogs:
    (pod: V1Pod): AppThunk =>
    async dispatch => {
      const podName = pod.metadata?.name;
      if (podName === undefined) {
        throw new Error(`Can't stop watching pod logs: pod name is undefined`);
      }

      const websocketClient = container.get(WebsocketClient);
      websocketClient.unsubscribeFromChannel(api.webSocket.Channel.LOGS);

      dispatch(podLogsDeleteAction(podName));
    },

  handleWebSocketMessage:
    (message: api.webSocket.NotificationMessage): AppThunk =>
    async (dispatch, getState) => {
      if (api.webSocket.isStatusMessage(message)) {
        const { params, status } = message;

        if (!api.webSocket.isWebSocketSubscribeLogsParams(params)) {
          console.debug('WebSocket(LOGS): unexpected message:', message);
          return;
        }

        const errorMessage = status.message || 'Unknown error while watching logs';
        console.debug(`WebSocket(LOGS): status code ${status.code}, reason: ${errorMessage}`);

        /* if container name is specified, then it's a single container logs. */

        if (params.containerName) {
          dispatch(
            podLogsReceiveAction({
              podName: params.podName,
              containerName: params.containerName,
              logs: errorMessage,
              failure: true,
            }),
          );
          return;
        }

        /* If container name is not specified, then backend failed to get pod to watch. We need to check if pod exists, and resubscribe to the channel. */

        const websocketClient = container.get(WebsocketClient);
        websocketClient.unsubscribeFromChannel(api.webSocket.Channel.LOGS);

        const allPods = selectAllPods(getState());
        if (allPods.find(pod => pod.metadata?.name === params.podName) === undefined) {
          console.debug('WebSocket(LOGS): pod not found, stop watching logs:', params.podName);
          return;
        }
        websocketClient.subscribeToChannel(api.webSocket.Channel.LOGS, params.namespace, {
          podName: params.podName,
        });
        return;
      }

      if (api.webSocket.isLogsMessage(message)) {
        const { containerName, logs, podName } = message;

        dispatch(
          podLogsReceiveAction({
            podName,
            containerName,
            logs,
            failure: false,
          }),
        );

        return;
      }

      console.warn('WebSocket: unexpected message:', message);
    },
};
