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

import { MockStoreEnhanced } from 'redux-mock-store';
import { ThunkDispatch } from 'redux-thunk';
import * as store from '..';
import { AppState } from '../..';
import { FakeStoreBuilder } from '../../__mocks__/storeBuilder';
import {
  selectAllEvents,
  selectEvents,
  selectEventsError,
  selectEventsResourceVersion,
} from '../selectors';
import { event1, event2 } from './stubs';

describe('Events store, selectors', () => {
  it('should return the error', () => {
    const fakeStore = new FakeStoreBuilder()
      .withEvents({ events: [], error: 'Something unexpected' }, false)
      .build() as MockStoreEnhanced<
      AppState,
      ThunkDispatch<AppState, undefined, store.KnownAction>
    >;
    const state = fakeStore.getState();

    const selectedError = selectEventsError(state);
    expect(selectedError).toEqual('Something unexpected');
  });

  it('should return all events', () => {
    const fakeStore = new FakeStoreBuilder()
      .withEvents({ events: [event1, event2] }, false)
      .build() as MockStoreEnhanced<
      AppState,
      ThunkDispatch<AppState, undefined, store.KnownAction>
    >;
    const state = fakeStore.getState();

    const allEvents = selectAllEvents(state);
    expect(allEvents).toEqual([event1, event2]);
  });

  it('should return the resource version', () => {
    const fakeStore = new FakeStoreBuilder()
      .withEvents({ events: [event1, event2], resourceVersion: '1234' }, false)
      .build() as MockStoreEnhanced<
      AppState,
      ThunkDispatch<AppState, undefined, store.KnownAction>
    >;
    const state = fakeStore.getState();

    const resourceVersion = selectEventsResourceVersion(state);
    expect(resourceVersion).toEqual('1234');
  });

  it('should filter events by pod name', () => {
    const fakeStore = new FakeStoreBuilder()
      .withEvents({ events: [event1, event2], resourceVersion: '1234' }, false)
      .withPods({
        pods: [
          {
            metadata: {
              name: event1.involvedObject.name,
              namespace: event1.involvedObject.namespace,
              uid: event1.involvedObject.uid,
            },
          },
          {
            metadata: {
              name: event2.involvedObject.name,
              namespace: event2.involvedObject.namespace,
              uid: event2.involvedObject.uid,
            },
          },
        ],
      })
      .build() as MockStoreEnhanced<
      AppState,
      ThunkDispatch<AppState, undefined, store.KnownAction>
    >;
    const state = fakeStore.getState();

    const selectEventsFn = selectEvents(state);
    expect(typeof selectEventsFn).toEqual('function');

    const events = selectEventsFn('pod-name-1');
    expect(events).toEqual([event1]);
  });
});
