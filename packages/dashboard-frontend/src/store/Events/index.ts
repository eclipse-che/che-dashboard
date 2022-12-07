/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
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
import { CoreV1Event, V1Pod } from '@kubernetes/client-node';
import { Action, Reducer } from 'redux';
import { AppThunk } from '..';
import { fetchEvents } from '../../services/dashboard-backend-client/eventsApi';
import { createObject } from '../helpers';
import { selectDefaultNamespace } from '../InfrastructureNamespaces/selectors';
import isSamePod from '../Pods/isSamePod';
import { AUTHORIZED, SanityCheckAction } from '../sanityCheckMiddleware';

export interface State {
  isLoading: boolean;
  events: CoreV1Event[];
  resourceVersion: string;
  error?: string;
}

export enum Type {
  REQUEST_EVENTS = 'REQUEST_EVENTS',
  RECEIVE_EVENTS = 'RECEIVE_EVENTS',
  RECEIVE_ERROR = 'RECEIVE_ERROR',
  DELETE_EVENTS = 'DELETE_EVENTS',
}

export interface RequestEventsAction extends Action, SanityCheckAction {
  type: Type.REQUEST_EVENTS;
}

export interface ReceiveEventsAction {
  type: Type.RECEIVE_EVENTS;
  events: CoreV1Event[];
  resourceVersion?: string;
}

export interface ReceiveErrorAction {
  type: Type.RECEIVE_ERROR;
  error: string;
}

export interface DeleteEventsAction {
  type: Type.DELETE_EVENTS;
  pod: V1Pod;
}

export type KnownAction =
  | RequestEventsAction
  | ReceiveEventsAction
  | ReceiveErrorAction
  | DeleteEventsAction;

export type ActionCreators = {
  requestEvents: () => AppThunk<KnownAction, Promise<void>>;
  deleteEvents: (pod: V1Pod) => AppThunk<KnownAction, void>;

  handleWebSocketMessage: (
    message: api.webSocket.NotificationMessage,
  ) => AppThunk<KnownAction, Promise<void>>;
};

export const actionCreators: ActionCreators = {
  requestEvents:
    (): AppThunk<KnownAction, Promise<void>> =>
    async (dispatch, getState): Promise<void> => {
      await dispatch({
        type: Type.REQUEST_EVENTS,
        check: AUTHORIZED,
      });

      const defaultKubernetesNamespace = selectDefaultNamespace(getState());
      const defaultNamespace = defaultKubernetesNamespace.name;

      try {
        const eventsList = await fetchEvents(defaultNamespace);

        dispatch({
          type: Type.RECEIVE_EVENTS,
          events: eventsList.items,
          resourceVersion: eventsList.metadata?.resourceVersion,
        });
      } catch (e) {
        const errorMessage = 'Failed to fetch events, reason: ' + helpers.errors.getMessage(e);
        dispatch({
          type: Type.RECEIVE_ERROR,
          error: errorMessage,
        });
        throw errorMessage;
      }
    },

  deleteEvents:
    (pod: V1Pod): AppThunk<KnownAction, void> =>
    (dispatch): void => {
      dispatch({
        type: Type.DELETE_EVENTS,
        pod,
      });
    },

  handleWebSocketMessage:
    (message: api.webSocket.NotificationMessage): AppThunk<KnownAction, Promise<void>> =>
    async (dispatch): Promise<void> => {
      console.debug('Received message from websocket', message);

      if (!api.webSocket.isEventMessage(message)) {
        console.warn('WebSocket: unexpected message:', message);
        return;
      }

      const { event, eventPhase } = message;
      switch (eventPhase) {
        case api.webSocket.EventPhase.ADDED:
          dispatch({
            type: Type.RECEIVE_EVENTS,
            events: [event],
          });
          break;
        default:
          console.warn('WebSocket: unexpected eventPhase:', message);
      }
    },
};

const unloadedState: State = {
  isLoading: false,
  events: [],
  resourceVersion: '0',
};

export const reducer: Reducer<State> = (
  state: State | undefined,
  incomingAction: Action,
): State => {
  if (state === undefined) {
    return unloadedState;
  }

  const action = incomingAction as KnownAction;
  switch (action.type) {
    case Type.REQUEST_EVENTS:
      return createObject(state, {
        isLoading: true,
        error: undefined,
      });
    case Type.RECEIVE_EVENTS:
      return createObject(state, {
        isLoading: false,
        events: state.events.concat(action.events),
        resourceVersion: action.resourceVersion ? action.resourceVersion : state.resourceVersion,
      });
    case Type.RECEIVE_ERROR:
      return createObject(state, {
        isLoading: false,
        error: action.error,
      });
    case Type.DELETE_EVENTS:
      return createObject(state, {
        events: state.events.filter(
          event =>
            isSamePod(action.pod, {
              metadata: {
                name: event.involvedObject.name,
                namespace: event.involvedObject.namespace,
                uid: event.involvedObject.uid,
              },
            }) === false,
        ),
      });
    default:
      return state;
  }
};
