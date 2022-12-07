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

import { AnyAction } from 'redux';
import * as testStore from '..';
import { AUTHORIZED } from '../../sanityCheckMiddleware';
import { event1, event2 } from './stubs';

describe('Events store, reducers', () => {
  it('should return initial state', () => {
    const incomingAction: testStore.RequestEventsAction = {
      type: testStore.Type.REQUEST_EVENTS,
      check: AUTHORIZED,
    };
    const initialState = testStore.reducer(undefined, incomingAction);

    const expectedState: testStore.State = {
      isLoading: false,
      events: [],
      resourceVersion: '0',
    };

    expect(initialState).toEqual(expectedState);
  });

  it('should return state if action type is not matched', () => {
    const initialState: testStore.State = {
      isLoading: true,
      events: [event1, event2],
      resourceVersion: '0',
    };
    const incomingAction = {
      type: 'OTHER_ACTION',
    } as AnyAction;
    const newState = testStore.reducer(initialState, incomingAction);

    const expectedState: testStore.State = {
      isLoading: true,
      events: [event1, event2],
      resourceVersion: '0',
    };
    expect(newState).toEqual(expectedState);
  });

  it('should handle REQUEST_EVENTS', () => {
    const initialState: testStore.State = {
      isLoading: false,
      events: [],
      error: 'unexpected error',
      resourceVersion: '0',
    };
    const incomingAction: testStore.RequestEventsAction = {
      type: testStore.Type.REQUEST_EVENTS,
      check: AUTHORIZED,
    };

    const newState = testStore.reducer(initialState, incomingAction);

    const expectedState: testStore.State = {
      isLoading: true,
      events: [],
      resourceVersion: '0',
    };

    expect(newState).toEqual(expectedState);
  });

  it('should handle RECEIVE_EVENTS', () => {
    const initialState: testStore.State = {
      isLoading: true,
      events: [event1],
      resourceVersion: '1',
    };
    const incomingAction: testStore.ReceiveEventsAction = {
      type: testStore.Type.RECEIVE_EVENTS,
      events: [event2],
      resourceVersion: '2',
    };

    const newState = testStore.reducer(initialState, incomingAction);

    const expectedState: testStore.State = {
      isLoading: false,
      events: [event1, event2],
      resourceVersion: '2',
    };

    expect(newState).toEqual(expectedState);
  });

  it('should handle RECEIVE_ERROR', () => {
    const initialState: testStore.State = {
      isLoading: true,
      events: [],
      resourceVersion: '0',
    };
    const incomingAction: testStore.ReceiveErrorAction = {
      type: testStore.Type.RECEIVE_ERROR,
      error: 'unexpected error',
    };

    const newState = testStore.reducer(initialState, incomingAction);

    const expectedState: testStore.State = {
      isLoading: false,
      events: [],
      error: 'unexpected error',
      resourceVersion: '0',
    };

    expect(newState).toEqual(expectedState);
  });

  it('should handle DELETE_EVENTS', () => {
    const initialState: testStore.State = {
      isLoading: false,
      events: [event1, event2],
      resourceVersion: '2',
    };
    const incomingAction: testStore.DeleteEventsAction = {
      type: testStore.Type.DELETE_EVENTS,
      pod: {
        metadata: {
          name: event1.involvedObject.name,
          namespace: event1.involvedObject.namespace,
          uid: event1.involvedObject.uid,
        },
      },
    };

    const newState = testStore.reducer(initialState, incomingAction);

    const expectedState: testStore.State = {
      isLoading: false,
      events: [event2],
      resourceVersion: '2',
    };

    expect(newState).toEqual(expectedState);
  });
});
