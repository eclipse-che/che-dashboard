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

import { CoreV1Event } from '@kubernetes/client-node';
import { UnknownAction } from 'redux';

import {
  eventDeleteAction,
  eventErrorAction,
  eventModifyAction,
  eventsReceiveAction,
  eventsRequestAction,
} from '@/store/Events/actions';
import { reducer, State, unloadedState } from '@/store/Events/reducer';

describe('Events, reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle eventsRequestAction', () => {
    const action = eventsRequestAction();
    const expectedState: State = {
      ...initialState,
      isLoading: true,
      error: undefined,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle eventsReceiveAction', () => {
    const events = [{ metadata: { name: 'event1' } }] as CoreV1Event[];
    const resourceVersion = '12345';
    const action = eventsReceiveAction({ events, resourceVersion });
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      events,
      resourceVersion,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle eventModifyAction', () => {
    const initialStateWithEvents: State = {
      ...initialState,
      events: [
        { metadata: { name: 'event1', uid: 'uid1', resourceVersion: '123' } },
        { metadata: { name: 'event2', uid: 'uid2', resourceVersion: '124' } },
      ] as CoreV1Event[],
    };
    const modifiedEvent = {
      metadata: { name: 'event1', uid: 'uid1', resourceVersion: '125' },
    } as CoreV1Event;

    const action = eventModifyAction({ event: modifiedEvent });
    const expectedState: State = {
      ...initialStateWithEvents,
      events: [modifiedEvent, initialStateWithEvents.events[1]],
      resourceVersion: '125',
    };

    expect(reducer(initialStateWithEvents, action)).toEqual(expectedState);
  });

  it('should handle eventDeleteAction', () => {
    const initialStateWithEvents: State = {
      ...initialState,
      events: [
        { metadata: { name: 'event1', uid: 'uid1' } },
        { metadata: { name: 'event2', uid: 'uid2' } },
      ] as CoreV1Event[],
    };
    const action = eventDeleteAction({
      event: { metadata: { name: 'event1', uid: 'uid1' } } as CoreV1Event,
    });
    const expectedState: State = {
      ...initialStateWithEvents,
      events: [initialStateWithEvents.events[1]],
    };

    expect(reducer(initialStateWithEvents, action)).toEqual(expectedState);
  });

  it('should handle eventErrorAction', () => {
    const error = 'Error message';
    const action = eventErrorAction({ error });
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      error,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should return the current state for unknown actions', () => {
    const unknownAction = { type: 'UNKNOWN_ACTION' } as UnknownAction;
    expect(reducer(initialState, unknownAction)).toEqual(initialState);
  });
});
