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
import EventEmitter from 'events';

import { getDevWorkspaceClient } from '@/routes/api/helpers/getDevWorkspaceClient';
import { webSocketHandler } from '@/routes/api/websocket';
import { logger } from '@/utils/logger';

jest.mock('../helpers/getToken.ts', () => ({
  getToken: jest.fn().mockReturnValue('test-token'),
}));
jest.mock('../helpers/getDevWorkspaceClient.ts');

describe('WebSocket handler', () => {
  let mockWs: EventEmitter & { send: jest.Mock };
  let mockRequest: unknown;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWs = Object.assign(new EventEmitter(), {
      send: jest.fn(),
      readyState: 1, // WebSocket.OPEN
    });
    mockRequest = {
      headers: { authorization: 'Bearer test-token' },
    };
  });

  it('should send StatusMessage to subscriber when watcher.start() rejects', async () => {
    const watchError = Object.assign(new Error('Unauthorized'), { statusCode: 401 });
    (getDevWorkspaceClient as jest.Mock).mockReturnValue({
      devworkspaceApi: {
        watchInNamespace: jest.fn().mockRejectedValue(watchError),
        stopWatching: jest.fn(),
      },
      eventApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
      podApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
      logsApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
    });

    webSocketHandler(mockWs as never, mockRequest as never);

    const subscribeMessage: api.webSocket.SubscribeMessage = {
      method: 'SUBSCRIBE',
      channel: api.webSocket.Channel.DEV_WORKSPACE,
      params: { namespace: 'test-ns', resourceVersion: '123' },
    };

    await new Promise<void>(resolve => {
      const originalSend = mockWs.send;
      mockWs.send = jest.fn((...args) => {
        originalSend(...args);
        resolve();
      });
      mockWs.emit('message', JSON.stringify(subscribeMessage));
    });

    expect(mockWs.send).toHaveBeenCalledTimes(1);
    const sentData = JSON.parse(mockWs.send.mock.calls[0][0] as string);
    expect(sentData.channel).toBe(api.webSocket.Channel.DEV_WORKSPACE);
    expect(sentData.message.eventPhase).toBe(api.webSocket.EventPhase.ERROR);
    expect(sentData.message.status.message).toBe('Unauthorized');
    expect(sentData.message.status.code).toBe(401);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Unauthorized' }),
      expect.stringContaining('Failed to start watcher'),
    );
  });

  it('should send StatusMessage when LOGS watcher rejects', async () => {
    const watchError = Object.assign(new Error('Forbidden'), { statusCode: 403 });
    (getDevWorkspaceClient as jest.Mock).mockReturnValue({
      devworkspaceApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
      eventApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
      podApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
      logsApi: {
        watchInNamespace: jest.fn().mockRejectedValue(watchError),
        stopWatching: jest.fn(),
      },
    });

    webSocketHandler(mockWs as never, mockRequest as never);

    const subscribeMessage = {
      method: 'SUBSCRIBE',
      channel: api.webSocket.Channel.LOGS,
      params: { namespace: 'test-ns', podName: 'test-pod' },
    };

    await new Promise<void>(resolve => {
      const originalSend = mockWs.send;
      mockWs.send = jest.fn((...args) => {
        originalSend(...args);
        resolve();
      });
      mockWs.emit('message', JSON.stringify(subscribeMessage));
    });

    expect(mockWs.send).toHaveBeenCalledTimes(1);
    const sentData = JSON.parse(mockWs.send.mock.calls[0][0] as string);
    expect(sentData.channel).toBe(api.webSocket.Channel.LOGS);
    expect(sentData.message.status.message).toBe('Forbidden');
    expect(sentData.message.status.code).toBe(403);
  });

  it('should not send error when watcher starts successfully', async () => {
    (getDevWorkspaceClient as jest.Mock).mockReturnValue({
      devworkspaceApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
      eventApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
      podApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
      logsApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
    });

    webSocketHandler(mockWs as never, mockRequest as never);

    const subscribeMessage: api.webSocket.SubscribeMessage = {
      method: 'SUBSCRIBE',
      channel: api.webSocket.Channel.EVENT,
      params: { namespace: 'test-ns', resourceVersion: '456' },
    };

    mockWs.emit('message', JSON.stringify(subscribeMessage));

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockWs.send).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should handle UNSUBSCRIBE message', () => {
    (getDevWorkspaceClient as jest.Mock).mockReturnValue({
      devworkspaceApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
      eventApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
      podApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
      logsApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
    });

    webSocketHandler(mockWs as never, mockRequest as never);

    const unsubscribeMessage: api.webSocket.UnsubscribeMessage = {
      method: 'UNSUBSCRIBE',
      channel: api.webSocket.Channel.DEV_WORKSPACE,
      params: {},
    };

    mockWs.emit('message', JSON.stringify(unsubscribeMessage));

    const client = (getDevWorkspaceClient as jest.Mock).mock.results[0].value;
    expect(client.devworkspaceApi.stopWatching).toHaveBeenCalled();
  });

  it('should handle close event', () => {
    (getDevWorkspaceClient as jest.Mock).mockReturnValue({
      devworkspaceApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
      eventApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
      podApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
      logsApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
    });

    webSocketHandler(mockWs as never, mockRequest as never);
    mockWs.emit('close', 1000, 'Normal closure');

    const client = (getDevWorkspaceClient as jest.Mock).mock.results[0].value;
    expect(client.devworkspaceApi.stopWatching).toHaveBeenCalled();
    expect(client.eventApi.stopWatching).toHaveBeenCalled();
    expect(client.podApi.stopWatching).toHaveBeenCalled();
    expect(client.logsApi.stopWatching).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('WebSocket connection closed'),
    );
  });

  it('should handle error event', () => {
    (getDevWorkspaceClient as jest.Mock).mockReturnValue({
      devworkspaceApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
      eventApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
      podApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
      logsApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
    });

    webSocketHandler(mockWs as never, mockRequest as never);
    const error = new Error('connection reset');
    mockWs.emit('error', error);

    const client = (getDevWorkspaceClient as jest.Mock).mock.results[0].value;
    expect(client.devworkspaceApi.stopWatching).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(error, expect.stringContaining('WebSocket'));
  });

  it('should warn on unexpected message payload', () => {
    (getDevWorkspaceClient as jest.Mock).mockReturnValue({
      devworkspaceApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
      eventApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
      podApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
      logsApi: {
        watchInNamespace: jest.fn().mockResolvedValue(undefined),
        stopWatching: jest.fn(),
      },
    });

    webSocketHandler(mockWs as never, mockRequest as never);
    mockWs.emit('message', JSON.stringify({ unexpected: true }));

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Unexpected WS message'),
      expect.any(String),
    );
  });
});
