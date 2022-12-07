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

import common, { api } from '@eclipse-che/common';
import EventEmitter from 'events';
import { injectable } from 'inversify';
import ReconnectingWebSocket, { CloseEvent, ErrorEvent } from 'reconnecting-websocket';
import { getDefer, IDeferred } from '../helpers/deferred';
import { delay } from '../helpers/delay';
import { prefix } from './const';

export enum ConnectionEvent {
  OPEN = 'open',
  CLOSE = 'close',
  ERROR = 'error',
}
export type ConnectionListener = (...args: unknown[]) => void;
export type ChannelListener = (message: api.webSocket.NotificationMessage) => void;

@injectable()
export class WebsocketClient {
  private connectDeferred: IDeferred<void> | undefined;
  private readonly channelEventListeners: Map<api.webSocket.Channel, ChannelListener[]> = new Map();
  private readonly connectionEventEmitter: EventEmitter = new EventEmitter();
  private readonly connectionEventListeners: Map<ConnectionEvent, ConnectionListener[]> = new Map();
  private websocketStream: ReconnectingWebSocket | undefined;
  private lastFiredConnectionEvent: [string, unknown[]] | undefined;
  public readonly websocketContext = `${prefix}/websocket`;

  constructor() {
    this.connectionEventEmitter.on(ConnectionEvent.CLOSE, (...args: unknown[]) =>
      this.handleConnectionEvent(ConnectionEvent.CLOSE, ...args),
    );
    this.connectionEventEmitter.on(ConnectionEvent.ERROR, (...args: unknown[]) =>
      this.handleConnectionEvent(ConnectionEvent.ERROR, ...args),
    );
    this.connectionEventEmitter.on(ConnectionEvent.OPEN, (...args: unknown[]) =>
      this.handleConnectionEvent(ConnectionEvent.OPEN, ...args),
    );
  }

  /**
   * If `existingEventNotification` equals ‘true’ then listener will be immediately notified about last fired event in case if their types match.
   */
  public addConnectionEventListener(
    type: ConnectionEvent,
    listener: ConnectionListener,
    existingEventNotification = false,
  ): void {
    const listeners = this.connectionEventListeners.get(type) || [];
    this.connectionEventListeners.set(type, [...listeners, listener]);

    if (existingEventNotification === false || this.lastFiredConnectionEvent === undefined) {
      return;
    }

    const [eventType, args] = this.lastFiredConnectionEvent;
    if (type === eventType) {
      listener(...args);
    }
  }

  public removeConnectionEventListener(type: ConnectionEvent, listener: ConnectionListener): void {
    const listeners = this.connectionEventListeners.get(type) || [];
    this.connectionEventListeners.set(
      type,
      listeners.filter(_listener => _listener !== listener),
    );
  }

  private handleConnectionEvent(eventType: ConnectionEvent, ...args: unknown[]): void {
    const listeners = this.connectionEventListeners.get(eventType) || [];
    this.lastFiredConnectionEvent = [eventType, args];
    listeners.forEach(listener => listener(...args));
  }

  /**
   * Performs connection to the pointed entrypoint.
   */
  public async connect(): Promise<void> {
    if (this.connectDeferred) {
      return this.connectDeferred.promise;
    }

    const deferred = getDefer<void>();

    const origin = new URL(window.location.href).origin;
    const location = origin.replace('http', 'ws') + this.websocketContext;
    this.websocketStream = new ReconnectingWebSocket(location, [], {
      connectionTimeout: 10000,
      minReconnectionDelay: 500,
    });

    this.websocketStream.addEventListener('open', () => {
      this.handleStreamOpen(this.websocketContext);
      deferred.resolve();
    });
    this.websocketStream.addEventListener('close', event => {
      this.handleStreamClose(event);
    });
    this.websocketStream.addEventListener('error', event => {
      this.handleStreamFail(event);
      deferred.reject();
    });
    this.websocketStream.addEventListener('message', event => {
      try {
        const message = this.parseMessageEvent(event);
        this.notifyListeners(message);
      } catch (e) {
        console.warn(common.helpers.errors.getMessage(e), event.data);
      }
    });

    this.connectDeferred = deferred;
    return this.connectDeferred.promise;
  }

  private handleStreamFail(event: ErrorEvent): void {
    console.warn(`WebSocket client '${this.websocketContext}' failed:`, event);
    this.connectionEventEmitter.emit(ConnectionEvent.ERROR, event);
  }

  private handleStreamOpen(websocketContext: string) {
    console.log(`WebSocket client '${websocketContext}' connected`);
    this.connectionEventEmitter.emit(ConnectionEvent.OPEN);
  }

  private handleStreamClose(event: CloseEvent) {
    console.log(`WebSocket client '${this.websocketContext}' closed:`, event);
    this.connectionEventEmitter.emit(ConnectionEvent.CLOSE, event);
  }

  private parseMessageEvent(event: MessageEvent<string>): api.webSocket.EventData {
    try {
      const dataMessage = JSON.parse(event.data);
      if (api.webSocket.isWebSocketEventData(dataMessage)) {
        return dataMessage;
      } else {
        throw new Error(`[WARN] Unexpected WS message payload:`);
      }
    } catch (e) {
      throw new Error(`[WARN] Can't parse the WS message payload:`);
    }
  }

  /**
   * Performs closing the connection.
   * @param code close code
   */
  public disconnect(code?: number): void {
    this.websocketStream?.close(code ? code : undefined);
    this.connectDeferred = undefined;
  }

  /**
   * Adds a listener on an event for the given channel.
   */
  public addChannelEventListener(channel: api.webSocket.Channel, listener: ChannelListener): void {
    const listeners = this.channelEventListeners.get(channel) || [];
    listeners.push(listener);
    this.channelEventListeners.set(channel, listeners);
  }

  /**
   * Removes a listener.
   */
  public removeChannelEventListener(
    channel: api.webSocket.Channel,
    listener: ChannelListener,
  ): void {
    const listeners = this.channelEventListeners.get(channel) || [];
    listeners?.splice(listeners.indexOf(listener), 1);
    this.channelEventListeners.set(channel, listeners);
  }

  /**
   * Send a message that subscribes to events for the given channel.
   */
  async subscribeToChannelEvents(
    channel: api.webSocket.Channel,
    namespace: string,
    resourceVersion: string,
  ): Promise<void> {
    if (this.websocketStream === undefined) {
      throw new Error('WebSocket is not initialized.');
    }

    const message: api.webSocket.SubscribeMessage = {
      method: 'SUBSCRIBE',
      channel,
      params: {
        namespace,
        resourceVersion,
      },
    };
    while (this.websocketStream.readyState !== this.websocketStream.OPEN) {
      await delay(1000);
    }
    return this.websocketStream.send(JSON.stringify(message));
  }

  /**
   * Send a message that unsubscribes to events for the given channel.
   */
  async unsubscribeToChannelEvents(channel: api.webSocket.Channel): Promise<void> {
    if (this.websocketStream === undefined) {
      throw new Error('WebSocket is not initialized.');
    }

    if (this.websocketStream.readyState !== this.websocketStream.OPEN) {
      return;
    }

    const message: api.webSocket.UnsubscribeMessage = {
      method: 'UNSUBSCRIBE',
      channel,
      params: {},
    };
    return this.websocketStream.send(JSON.stringify(message));
  }

  /**
   * Notifies all listeners for the given channel.
   */
  private notifyListeners(dataMessage: api.webSocket.EventData): void {
    const { channel, message } = dataMessage;
    const listeners = this.channelEventListeners.get(channel) || [];
    listeners.forEach(handler => handler(message));
  }
}
