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

import { api } from '@eclipse-che/common';
import { V1Pod } from '@kubernetes/client-node';

import { container } from '@/inversify.config';
import { WebsocketClient } from '@/services/backend-client/websocketClient';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import * as infrastructureNamespacesSelectors from '@/store/InfrastructureNamespaces/selectors';
import {
  actionCreators,
  podLogsDeleteAction,
  podLogsReceiveAction,
} from '@/store/Pods/Logs/actions';

jest
  .spyOn(infrastructureNamespacesSelectors, 'selectDefaultNamespace')
  .mockReturnValue({ name: 'test-namespace', attributes: { phase: 'Active' } });

describe('Pods, actions', () => {
  const mockAddChannelMessageListener = jest.fn();
  const mockUnsubscribeFromChannel = jest.fn();
  const mockSubscribeToChannel = jest.fn();

  const mockPod = { metadata: { name: 'pod1' } } as V1Pod;

  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore({
      pods: {
        pods: [mockPod],
        isLoading: false,
        resourceVersion: '1234',
      },
    });

    class MockWebsocketClient extends WebsocketClient {
      async connect() {
        return;
      }
      hasChannelMessageListener() {
        return false;
      }
      addChannelMessageListener(...args: unknown[]): void {
        mockAddChannelMessageListener(...args);
      }
      public unsubscribeFromChannel(...args: unknown[]): void {
        mockUnsubscribeFromChannel(...args);
      }
      public subscribeToChannel(...args: unknown[]): void {
        mockSubscribeToChannel(...args);
      }
    }

    container.snapshot();
    container.rebind(WebsocketClient).to(MockWebsocketClient).inSingletonScope();
  });

  afterEach(() => {
    jest.clearAllMocks();
    container.restore();
  });

  describe('watchPodLogs', () => {
    it('should dispatch podLogsReceiveAction on receiving logs message', async () => {
      const mockPod = { metadata: { name: 'pod1' } } as V1Pod;

      await store.dispatch(actionCreators.watchPodLogs(mockPod));

      const actions = store.getActions();
      expect(actions).toHaveLength(0);

      expect(mockAddChannelMessageListener).toHaveBeenCalledWith(
        api.webSocket.Channel.LOGS,
        expect.any(Function),
      );
      expect(mockUnsubscribeFromChannel).toHaveBeenCalledWith(api.webSocket.Channel.LOGS);
      expect(mockSubscribeToChannel).toHaveBeenCalledWith(
        api.webSocket.Channel.LOGS,
        'test-namespace',
        {
          podName: 'pod1',
        },
      );
    });

    it('should throw an error if pod name is undefined', async () => {
      const mockPod = { metadata: {} } as V1Pod;

      await expect(store.dispatch(actionCreators.watchPodLogs(mockPod))).rejects.toThrow(
        `Can't watch pod logs: pod name is undefined`,
      );
    });
  });

  describe('stopWatchingPodLogs', () => {
    it('should dispatch podLogsDeleteAction on stop watching logs', async () => {
      const mockPod = { metadata: { name: 'pod1' } } as V1Pod;

      await store.dispatch(actionCreators.stopWatchingPodLogs(mockPod));

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(podLogsDeleteAction('pod1'));
    });

    it('should throw an error if pod name is undefined', async () => {
      const mockPod = { metadata: {} } as V1Pod;

      await expect(store.dispatch(actionCreators.stopWatchingPodLogs(mockPod))).rejects.toThrow(
        `Can't stop watching pod logs: pod name is undefined`,
      );
    });
  });

  describe('handleWebSocketMessage', () => {
    it('should handle WebSocket status message and resubscribe if pod exists', async () => {
      const mockMessage = {
        status: { code: 500, message: 'Internal Server Error' },
        eventPhase: api.webSocket.EventPhase.ERROR,
        // no `containerName` field
        params: { podName: 'pod1', namespace: 'test-namespace' },
      } as api.webSocket.StatusMessage;

      await store.dispatch(actionCreators.handleWebSocketMessage(mockMessage));

      const actions = store.getActions();
      expect(actions).toHaveLength(0);

      expect(mockUnsubscribeFromChannel).toHaveBeenCalledWith(api.webSocket.Channel.LOGS);
      expect(mockSubscribeToChannel).toHaveBeenCalledWith(
        api.webSocket.Channel.LOGS,
        'test-namespace',
        { podName: 'pod1' },
      );
    });

    it('should handle WebSocket status message and not resubscribe if pod does not exist', async () => {
      const mockMessage = {
        status: { code: 500, message: 'Internal Server Error' },
        eventPhase: api.webSocket.EventPhase.ERROR,
        // no `containerName` field
        params: { podName: 'pod1', namespace: 'test-namespace' },
      } as api.webSocket.NotificationMessage;

      const storeNoPods = createMockStore({
        pods: {
          pods: [],
          isLoading: false,
          resourceVersion: '1234',
        },
      });

      await storeNoPods.dispatch(actionCreators.handleWebSocketMessage(mockMessage));

      const actions = store.getActions();
      expect(actions).toHaveLength(0);

      expect(mockUnsubscribeFromChannel).toHaveBeenCalledWith(api.webSocket.Channel.LOGS);
      expect(mockSubscribeToChannel).not.toHaveBeenCalled();
    });

    it('should handle WebSocket message with unexpected params', async () => {
      const mockMessage = {
        status: { code: 500, message: 'Internal Server Error' },
        eventPhase: api.webSocket.EventPhase.ERROR,
        params: { unexpectedField: 'unexpectedValue' } as unknown,
      } as api.webSocket.NotificationMessage;

      console.debug = jest.fn();

      await store.dispatch(actionCreators.handleWebSocketMessage(mockMessage));

      expect(console.debug).toHaveBeenCalledWith(
        'WebSocket(LOGS): unexpected message:',
        mockMessage,
      );

      expect(mockUnsubscribeFromChannel).not.toHaveBeenCalled();
      expect(mockSubscribeToChannel).not.toHaveBeenCalled();
    });

    it('should handle WebSocket status message and dispatch podLogsReceiveAction with failure=`true`', async () => {
      const mockMessage = {
        status: {
          code: 500,
          // no `message` field to test default message as well
          // message: 'Internal Server Error',
        },
        eventPhase: api.webSocket.EventPhase.ERROR,
        params: { podName: 'pod1', namespace: 'test-namespace', containerName: 'container1' },
      } as api.webSocket.StatusMessage;

      await store.dispatch(actionCreators.handleWebSocketMessage(mockMessage));

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(
        podLogsReceiveAction({
          podName: 'pod1',
          containerName: 'container1',
          logs: 'Unknown error while watching logs',
          failure: true,
        }),
      );

      expect(mockUnsubscribeFromChannel).not.toHaveBeenCalled();
      expect(mockSubscribeToChannel).not.toHaveBeenCalled();
    });

    it('should handle WebSocket logs message', async () => {
      const mockMessage = {
        eventPhase: api.webSocket.EventPhase.ADDED,
        containerName: 'container1',
        podName: 'pod1',
        logs: 'log message',
      } as api.webSocket.LogsMessage;

      await store.dispatch(actionCreators.handleWebSocketMessage(mockMessage));

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(
        podLogsReceiveAction({
          podName: 'pod1',
          containerName: 'container1',
          logs: 'log message',
          failure: false,
        }),
      );
    });

    it('should log unexpected WebSocket message', async () => {
      const mockMessage = {
        unexpectedField: 'unexpectedValue',
      } as unknown as api.webSocket.NotificationMessage;

      console.warn = jest.fn();

      await store.dispatch(actionCreators.handleWebSocketMessage(mockMessage));

      expect(console.warn).toHaveBeenCalledWith('WebSocket: unexpected message:', mockMessage);
    });
  });
});
