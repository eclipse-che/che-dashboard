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
import { CoreV1Event } from '@kubernetes/client-node';
import { createAction } from '@reduxjs/toolkit';

import { container } from '@/inversify.config';
import { fetchEvents } from '@/services/backend-client/eventsApi';
import { WebsocketClient } from '@/services/backend-client/websocketClient';
import { AppThunk } from '@/store';
import { selectDefaultNamespace } from '@/store/InfrastructureNamespaces/selectors';
import { verifyAuthorized } from '@/store/SanityCheck';

export const eventsRequestAction = createAction('events/request');

type EventsReceivePayload = {
  events: CoreV1Event[];
  resourceVersion: string | undefined;
};
export const eventsReceiveAction = createAction<EventsReceivePayload>('events/receive');

type EventModifyAction = {
  event: CoreV1Event;
};
export const eventModifyAction = createAction<EventModifyAction>('events/modify');

type EventDeleteAction = {
  event: CoreV1Event;
};
export const eventDeleteAction = createAction<EventDeleteAction>('events/delete');

type EventErrorAction = {
  error: string;
};
export const eventErrorAction = createAction<EventErrorAction>('events/error');

export const actionCreators = {
  requestEvents:
    (): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      const defaultKubernetesNamespace = selectDefaultNamespace(getState());
      const defaultNamespace = defaultKubernetesNamespace.name;

      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(eventsRequestAction());

        const eventsList = await fetchEvents(defaultNamespace);
        dispatch(
          eventsReceiveAction({
            events: eventsList.items,
            resourceVersion: eventsList.metadata?.resourceVersion,
          }),
        );
      } catch (e) {
        const errorMessage = 'Failed to fetch events, reason: ' + helpers.errors.getMessage(e);
        dispatch(eventErrorAction({ error: errorMessage }));
        throw e;
      }
    },

  handleWebSocketMessage:
    (message: api.webSocket.NotificationMessage): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      if (api.webSocket.isStatusMessage(message)) {
        const { status } = message;

        const errorMessage = `WebSocket(EVENT): status code ${status.code}, reason: ${status.message}`;
        console.debug(errorMessage);

        if (status.code !== 200) {
          /* in case of error status trying to fetch all events and re-subscribe to websocket channel */

          const websocketClient = container.get(WebsocketClient);

          websocketClient.unsubscribeFromChannel(api.webSocket.Channel.EVENT);

          await dispatch(actionCreators.requestEvents());

          const defaultKubernetesNamespace = selectDefaultNamespace(getState());
          const namespace = defaultKubernetesNamespace.name;
          const getResourceVersion = () => {
            const state = getState();
            return state.events.resourceVersion;
          };
          websocketClient.subscribeToChannel(api.webSocket.Channel.EVENT, namespace, {
            getResourceVersion,
          });
        }
        return;
      }

      if (api.webSocket.isEventMessage(message)) {
        const { event, eventPhase } = message;
        switch (eventPhase) {
          case api.webSocket.EventPhase.ADDED:
            dispatch(
              eventsReceiveAction({
                events: [event],
                resourceVersion: event.metadata?.resourceVersion,
              }),
            );
            return;
          case api.webSocket.EventPhase.MODIFIED:
            dispatch(eventModifyAction({ event }));
            return;
          case api.webSocket.EventPhase.DELETED:
            dispatch(eventDeleteAction({ event }));
            return;
        }
      }

      console.warn('WebSocket: unexpected message:', message);
    },
};
