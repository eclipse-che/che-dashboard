/*
 * Copyright (c) 2018-2023 Red Hat, Inc.
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
import { Action, Reducer } from 'redux';
import { AppThunk } from '..';
import { fetchEvents } from '../../services/dashboard-backend-client/eventsApi';
import { createObject } from '../helpers';
import { selectDefaultNamespace } from '../InfrastructureNamespaces/selectors';
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
  MODIFY_EVENT = 'MODIFY_EVENT',
  RECEIVE_ERROR = 'RECEIVE_ERROR',
  DELETE_OLD_EVENTS = 'DELETE_OLD_EVENTS',
}

export interface RequestEventsAction extends Action, SanityCheckAction {
  type: Type.REQUEST_EVENTS;
}

export interface ReceiveEventsAction {
  type: Type.RECEIVE_EVENTS;
  events: CoreV1Event[];
  resourceVersion?: string;
}

export interface ModifyEventAction {
  type: Type.MODIFY_EVENT;
  event: CoreV1Event;
}

export interface ReceiveErrorAction {
  type: Type.RECEIVE_ERROR;
  error: string;
}

export interface DeleteOldEventsAction {
  type: Type.DELETE_OLD_EVENTS;
  resourceVersion: string;
}

export type KnownAction =
  | RequestEventsAction
  | ReceiveEventsAction
  | ModifyEventAction
  | ReceiveErrorAction
  | DeleteOldEventsAction;

export type ActionCreators = {
  requestEvents: () => AppThunk<KnownAction, Promise<void>>;
  clearOldEvents: () => AppThunk<KnownAction, void>;

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
        dispatch(actionCreators.clearOldEvents());
      } catch (e) {
        const errorMessage = 'Failed to fetch events, reason: ' + helpers.errors.getMessage(e);
        dispatch({
          type: Type.RECEIVE_ERROR,
          error: errorMessage,
        });
        throw errorMessage;
      }
    },

  clearOldEvents:
    (): AppThunk<KnownAction, void> =>
    (dispatch, getState): void => {
      // for all started workspaces find the oldest resource version to delete events older than that
      const startedWorkspaces = getState().devWorkspaces.startedWorkspaces;
      const startedWorkspacesResourceVersions = Object.values(startedWorkspaces);
      const firstStartedWorkspaceResourceVersion = startedWorkspacesResourceVersions
        .sort(compareResourceVersion)
        .shift();
      if (firstStartedWorkspaceResourceVersion === undefined) {
        return;
      }

      dispatch({
        type: Type.DELETE_OLD_EVENTS,
        resourceVersion: firstStartedWorkspaceResourceVersion,
      });
    },

  handleWebSocketMessage:
    (message: api.webSocket.NotificationMessage): AppThunk<KnownAction, Promise<void>> =>
    async (dispatch): Promise<void> => {
      if (api.webSocket.isEventMessage(message)) {
        const { event, eventPhase } = message;
        switch (eventPhase) {
          case api.webSocket.EventPhase.ADDED:
            dispatch({
              type: Type.RECEIVE_EVENTS,
              events: [event],
            });
            break;
          case api.webSocket.EventPhase.MODIFIED:
            dispatch({
              type: Type.MODIFY_EVENT,
              event,
            });
            break;
          default:
            console.warn('WebSocket: unexpected eventPhase:', message);
        }
        return;
      }

      console.warn('WebSocket: unexpected message:', message);
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
    case Type.MODIFY_EVENT:
      return createObject(state, {
        events: state.events.map(event => {
          if (event.metadata.uid === action.event.metadata.uid) {
            return action.event;
          }
          return event;
        }),
      });
    case Type.RECEIVE_ERROR:
      return createObject(state, {
        isLoading: false,
        error: action.error,
      });
    case Type.DELETE_OLD_EVENTS:
      return createObject(state, {
        events: state.events.filter(event => isOldEvent(event, action.resourceVersion) === false),
      });
    default:
      return state;
  }
};

function isOldEvent(event: CoreV1Event, resourceVersion: string): boolean {
  return compareResourceVersion(event.metadata.resourceVersion, resourceVersion) < 0;
}

function compareResourceVersion(
  versionA: string | undefined,
  versionB: string | undefined,
): number {
  if (versionA === undefined || versionB === undefined) {
    return 0;
  }

  const aNum = parseInt(versionA, 10);
  const bNum = parseInt(versionB, 10);
  if (isNaN(aNum) || isNaN(bNum)) {
    return 0;
  }

  return aNum - bNum;
}
