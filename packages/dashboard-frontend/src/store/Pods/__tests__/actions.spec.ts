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

import { container } from '@/inversify.config';
import { fetchPods } from '@/services/backend-client/podsApi';
import { WebsocketClient } from '@/services/backend-client/websocketClient';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import * as infrastructureNamespacesSelector from '@/store/InfrastructureNamespaces/selectors';
import {
  actionCreators,
  podDeleteAction,
  podListErrorAction,
  podListReceiveAction,
  podListRequestAction,
  podModifyAction,
  podReceiveAction,
} from '@/store/Pods/actions';
import { verifyAuthorized } from '@/store/SanityCheck';

jest.mock('@/services/backend-client/podsApi');
jest.mock('@/store/SanityCheck');

const mockNamespace = 'test-namespace';
jest.spyOn(infrastructureNamespacesSelector, 'selectDefaultNamespace').mockReturnValue({
  name: mockNamespace,
  attributes: { phase: 'Active' },
});
(verifyAuthorized as jest.Mock).mockResolvedValue(true);

describe('Pods Actions', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore({
      pods: {
        pods: [],
        isLoading: false,
        error: undefined,
        resourceVersion: '1234',
      },
    });
    jest.clearAllMocks();
  });

  describe('requestPods', () => {
    it('should dispatch receive action on successful fetch', async () => {
      const mockPods = [{ metadata: { name: 'pod1' } }] as V1Pod[];
      const mockResourceVersion = '12345';

      (fetchPods as jest.Mock).mockResolvedValue({
        items: mockPods,
        metadata: { resourceVersion: mockResourceVersion },
      });

      await store.dispatch(actionCreators.requestPods());

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(podListRequestAction());
      expect(actions[1]).toEqual(
        podListReceiveAction({
          pods: mockPods,
          resourceVersion: mockResourceVersion,
        }),
      );
    });

    it('should dispatch error action on failed fetch', async () => {
      const errorMessage = 'Network error';

      (fetchPods as jest.Mock).mockRejectedValue(new Error(errorMessage));
      jest.spyOn(helpers.errors, 'getMessage').mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.requestPods())).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(podListRequestAction());
      expect(actions[1]).toEqual(
        podListErrorAction(`Failed to fetch pods, reason: ${errorMessage}`),
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
      (fetchPods as jest.Mock).mockResolvedValue({
        items: [],
      });

      await store.dispatch(actionCreators.handleWebSocketMessage(mockMessage));

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(podListRequestAction());
      expect(actions[1]).toEqual(
        podListReceiveAction({
          pods: [],
          resourceVersion: undefined,
        }),
      );
      expect(mockUnsubscribeFromChannel).toHaveBeenCalledWith(api.webSocket.Channel.POD);
      expect(mockSubscribeToChannel).toHaveBeenCalledWith(
        api.webSocket.Channel.POD,
        mockNamespace,
        expect.any(Object),
      );
    });

    it('should handle pod message with ADDED phase', async () => {
      const mockPod = { metadata: { name: 'pod1', resourceVersion: '12345' } } as V1Pod;
      const mockMessage = {
        pod: mockPod,
        eventPhase: api.webSocket.EventPhase.ADDED,
      } as api.webSocket.NotificationMessage;

      await store.dispatch(actionCreators.handleWebSocketMessage(mockMessage));

      const actions = store.getActions();
      expect(actions[0]).toEqual(podReceiveAction(mockPod));
    });

    it('should handle pod message with MODIFIED phase', async () => {
      const mockPod = { metadata: { name: 'pod1' } } as V1Pod;
      const mockMessage = {
        pod: mockPod,
        eventPhase: api.webSocket.EventPhase.MODIFIED,
      } as api.webSocket.NotificationMessage;

      await store.dispatch(actionCreators.handleWebSocketMessage(mockMessage));

      const actions = store.getActions();
      expect(actions[0]).toEqual(podModifyAction(mockPod));
    });

    it('should handle pod message with DELETED phase', async () => {
      const mockPod = { metadata: { name: 'pod1' } } as V1Pod;
      const mockMessage = {
        pod: mockPod,
        eventPhase: api.webSocket.EventPhase.DELETED,
      } as api.webSocket.NotificationMessage;

      await store.dispatch(actionCreators.handleWebSocketMessage(mockMessage));

      const actions = store.getActions();
      expect(actions[0]).toEqual(podDeleteAction(mockPod));
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
