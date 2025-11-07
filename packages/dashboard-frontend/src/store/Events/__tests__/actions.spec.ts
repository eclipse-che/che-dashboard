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

import { api, helpers } from '@eclipse-che/common';
import { CoreV1Event } from '@kubernetes/client-node';

import { container } from '@/inversify.config';
import { fetchEvents } from '@/services/backend-client/eventsApi';
import { WebsocketClient } from '@/services/backend-client/websocketClient';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import {
  actionCreators,
  eventDeleteAction,
  eventErrorAction,
  eventModifyAction,
  eventsReceiveAction,
  eventsRequestAction,
} from '@/store/Events/actions';
import * as namespaceSelectors from '@/store/InfrastructureNamespaces/selectors';
import { verifyAuthorized } from '@/store/SanityCheck';

jest.mock('@/services/backend-client/eventsApi');
jest.mock('@/store/Events/selectors');
jest.mock('@/store/SanityCheck');
jest.mock('@eclipse-che/common', () => {
  const original = jest.requireActual('@eclipse-che/common');
  return {
    ...original,
    helpers: {
      ...original.helpers,
      errors: {
        getMessage: jest.fn(),
      },
    },
  };
});

describe('Events Actions', () => {
  const mockNamespace = 'test-namespace';
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore({});
    jest.clearAllMocks();
  });

  describe('requestEvents', () => {
    it('should dispatch receive action on successful fetch', async () => {
      const mockEvents = [{ metadata: { name: 'event1' } }] as CoreV1Event[];
      const mockResourceVersion = '12345';

      jest
        .spyOn(namespaceSelectors, 'selectDefaultNamespace')
        .mockReturnValue({ name: mockNamespace, attributes: { phase: 'Active' } });
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchEvents as jest.Mock).mockResolvedValue({
        items: mockEvents,
        metadata: { resourceVersion: mockResourceVersion },
      });

      await store.dispatch(actionCreators.requestEvents());

      const actions = store.getActions();
      expect(actions[0]).toEqual(eventsRequestAction());
      expect(actions[1]).toEqual(
        eventsReceiveAction({
          events: mockEvents,
          resourceVersion: mockResourceVersion,
        }),
      );
    });

    it('should dispatch error action on failed fetch', async () => {
      const errorMessage = 'Network error';
      jest
        .spyOn(namespaceSelectors, 'selectDefaultNamespace')
        .mockReturnValue({ name: mockNamespace, attributes: { phase: 'Active' } });
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchEvents as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.requestEvents())).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions[0]).toEqual(eventsRequestAction());
      expect(actions[1]).toEqual(
        eventErrorAction({ error: `Failed to fetch events, reason: ${errorMessage}` }),
      );
    });
  });

  describe('handleWebSocketMessage', () => {
    let mockUnsubscribeFromChannel: jest.Mock;
    let mockSubscribeToChannel: jest.Mock;

    beforeEach(() => {
      mockUnsubscribeFromChannel = jest.fn();
      mockSubscribeToChannel = jest.fn();

      class MockWebsocketClient extends WebsocketClient {
        public unsubscribeFromChannel(
          ...args: Parameters<WebsocketClient['unsubscribeFromChannel']>
        ) {
          mockUnsubscribeFromChannel(...args);
        }
        public subscribeToChannel(...args: Parameters<WebsocketClient['subscribeToChannel']>) {
          mockSubscribeToChannel(...args);
        }
      }
      container.snapshot();
      container.rebind(WebsocketClient).to(MockWebsocketClient).inSingletonScope();
    });

    afterEach(() => {
      container.restore();
    });

    it('should handle status message and re-subscribe on error status', async () => {
      const mockMessage = {
        status: { code: 500, message: 'Internal Server Error' },
        eventPhase: api.webSocket.EventPhase.ERROR,
      } as api.webSocket.StatusMessage;
      const mockEvents = [{ metadata: { name: 'event1' } }] as CoreV1Event[];
      const mockResourceVersion = '12345';

      jest
        .spyOn(namespaceSelectors, 'selectDefaultNamespace')
        .mockReturnValue({ name: mockNamespace, attributes: { phase: 'Active' } });
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchEvents as jest.Mock).mockResolvedValue({
        items: mockEvents,
        metadata: { resourceVersion: mockResourceVersion },
      });

      await store.dispatch(actionCreators.handleWebSocketMessage(mockMessage));

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(eventsRequestAction());
      expect(actions[1]).toEqual(
        eventsReceiveAction({
          events: mockEvents,
          resourceVersion: mockResourceVersion,
        }),
      );
      expect(mockUnsubscribeFromChannel).toHaveBeenCalledWith(api.webSocket.Channel.EVENT);
      expect(mockSubscribeToChannel).toHaveBeenCalledWith(
        api.webSocket.Channel.EVENT,
        mockNamespace,
        expect.any(Object),
      );
    });

    it('should handle event message with ADDED phase', async () => {
      const mockEvent = { metadata: { name: 'event1', resourceVersion: '12345' } } as CoreV1Event;
      const mockMessage = {
        event: mockEvent,
        eventPhase: api.webSocket.EventPhase.ADDED,
      } as api.webSocket.NotificationMessage;

      await store.dispatch(actionCreators.handleWebSocketMessage(mockMessage));

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(
        eventsReceiveAction({
          events: [mockEvent],
          resourceVersion: mockEvent.metadata?.resourceVersion,
        }),
      );
    });

    it('should handle event message with MODIFIED phase', async () => {
      const mockEvent = { metadata: { name: 'event1' } } as CoreV1Event;
      const mockMessage = {
        event: mockEvent,
        eventPhase: api.webSocket.EventPhase.MODIFIED,
      } as api.webSocket.NotificationMessage;

      await store.dispatch(actionCreators.handleWebSocketMessage(mockMessage));

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(eventModifyAction({ event: mockEvent }));
    });

    it('should handle event message with DELETED phase', async () => {
      const mockEvent = { metadata: { name: 'event1' } } as CoreV1Event;
      const mockMessage = {
        event: mockEvent,
        eventPhase: api.webSocket.EventPhase.DELETED,
      } as api.webSocket.NotificationMessage;

      await store.dispatch(actionCreators.handleWebSocketMessage(mockMessage));

      const actions = store.getActions();
      expect(actions[0]).toEqual(eventDeleteAction({ event: mockEvent }));
    });

    it('should log unexpected message', async () => {
      const mockMessage = {
        unexpectedField: 'unexpectedValue',
      } as unknown as api.webSocket.NotificationMessage;

      console.warn = jest.fn();

      await store.dispatch(actionCreators.handleWebSocketMessage(mockMessage));

      expect(console.warn).toHaveBeenCalledWith('WebSocket: unexpected message:', mockMessage);
    });
  });
});
