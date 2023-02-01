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

import { api } from '@eclipse-che/common';
import { V1Status } from '@kubernetes/client-node';
import mockAxios, { AxiosError } from 'axios';
import { MockStoreEnhanced } from 'redux-mock-store';
import { ThunkDispatch } from 'redux-thunk';
import * as testStore from '..';
import { AppState } from '../..';
import { AUTHORIZED } from '../../sanityCheckMiddleware';
import { FakeStoreBuilder } from '../../__mocks__/storeBuilder';
import { event1, event2 } from './stubs';

describe('Events store, actions', () => {
  let appStore: MockStoreEnhanced<
    AppState,
    ThunkDispatch<AppState, undefined, testStore.KnownAction>
  >;

  beforeEach(() => {
    appStore = new FakeStoreBuilder().build() as MockStoreEnhanced<
      AppState,
      ThunkDispatch<AppState, undefined, testStore.KnownAction>
    >;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create REQUEST_EVENTS and RECEIVE_EVENTS when fetching events', async () => {
    (mockAxios.get as jest.Mock).mockResolvedValueOnce({
      data: { items: [event1, event2] },
    });

    await appStore.dispatch(testStore.actionCreators.requestEvents());

    const actions = appStore.getActions();

    const expectedActions: testStore.KnownAction[] = [
      {
        type: testStore.Type.REQUEST_EVENTS,
        check: AUTHORIZED,
      },
      {
        type: testStore.Type.RECEIVE_EVENTS,
        events: [event1, event2],
      },
    ];

    expect(actions).toEqual(expectedActions);
  });

  it('should create REQUEST_EVENTS and RECEIVE_ERROR when fails to fetch events', async () => {
    (mockAxios.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      code: '500',
      message: 'Something unexpected happened.',
    } as AxiosError);

    try {
      await appStore.dispatch(testStore.actionCreators.requestEvents());
    } catch (e) {
      // noop
    }

    const actions = appStore.getActions();

    const expectedActions: testStore.KnownAction[] = [
      {
        type: testStore.Type.REQUEST_EVENTS,
        check: AUTHORIZED,
      },
      {
        type: testStore.Type.RECEIVE_ERROR,
        error: expect.stringContaining('Something unexpected happened.'),
      },
    ];

    expect(actions).toEqual(expectedActions);
  });

  it('should create DELETE_OLD_EVENTS action', () => {
    const _appStore = new FakeStoreBuilder()
      .withDevWorkspaces({
        startedWorkspaces: {
          workspace123: '123',
          workspace456: '456',
        },
      })
      .build() as MockStoreEnhanced<
      AppState,
      ThunkDispatch<AppState, undefined, testStore.KnownAction>
    >;
    _appStore.dispatch(testStore.actionCreators.clearOldEvents());

    const actions = _appStore.getActions();

    const expectedActions: testStore.KnownAction[] = [
      {
        type: testStore.Type.DELETE_OLD_EVENTS,
        resourceVersion: '123',
      },
    ];

    expect(actions).toEqual(expectedActions);
  });

  describe('handle WebSocket events', () => {
    it('should create RECEIVE_EVENTS action when receiving a new event', () => {
      appStore.dispatch(
        testStore.actionCreators.handleWebSocketMessage({
          event: event1,
          eventPhase: api.webSocket.EventPhase.ADDED,
        }),
      );

      const actions = appStore.getActions();

      const expectedActions: testStore.KnownAction[] = [
        {
          type: testStore.Type.RECEIVE_EVENTS,
          events: [event1],
        },
      ];

      expect(actions).toEqual(expectedActions);
    });

    it('should create MODIFY_EVENT action when receiving a modified event', () => {
      appStore.dispatch(
        testStore.actionCreators.handleWebSocketMessage({
          event: event1,
          eventPhase: api.webSocket.EventPhase.MODIFIED,
        }),
      );

      const actions = appStore.getActions();

      const expectedActions: testStore.KnownAction[] = [
        {
          type: testStore.Type.MODIFY_EVENT,
          event: event1,
        },
      ];

      expect(actions).toEqual(expectedActions);
    });

    it('should not create any action when receiving an unexpected message', () => {
      appStore.dispatch(
        testStore.actionCreators.handleWebSocketMessage({
          status: {} as V1Status,
          eventPhase: api.webSocket.EventPhase.ERROR,
        }),
      );

      const actions = appStore.getActions();

      const expectedActions: testStore.KnownAction[] = [];

      expect(actions).toEqual(expectedActions);
    });

    it('should not create any action when receiving a message with an unexpected eventPhase', () => {
      appStore.dispatch(
        testStore.actionCreators.handleWebSocketMessage({
          event: event1,
          eventPhase: api.webSocket.EventPhase.DELETED,
        }),
      );

      const actions = appStore.getActions();

      const expectedActions: testStore.KnownAction[] = [];

      expect(actions).toEqual(expectedActions);
    });
  });
});
