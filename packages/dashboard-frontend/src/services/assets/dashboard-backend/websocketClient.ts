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

import { prefix } from './const';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { getDefer } from '../../helpers/deferred';
import { KeycloakAuthService } from '../../keycloak/auth';

export type SubscribeMessage = {
  request: string,
  channel: string,
  params: { token?: string, namespace: string, resourceVersion?: string }
};

export type PublishMessage = {
  channel: string,
  message: any
};

export class WebsocketClient {
  private websocketStream: ReconnectingWebSocket;
  private handlers: { [channel: string]: Function[] } = {};

  /**
   * Performs connection to the pointed entrypoint.
   */
  connect(): Promise<any> {
    const deferred = getDefer();
    if (this.websocketStream) {
      this.websocketStream.close();
    }
    const websocketContext = `${prefix}/websocket`
    const location = new URL(window.location.href).origin.replace('http', 'ws') + websocketContext;
    this.websocketStream = new ReconnectingWebSocket(
      location,
      [], {
      connectionTimeout: 10000,
      maxRetries: 10
    });
    this.websocketStream.addEventListener('open', event => {
      deferred.resolve();
    });
    this.websocketStream.addEventListener('error', event => {
      deferred.reject();
    });
    this.websocketStream.addEventListener('message', mes => {
      const { channel, message } = JSON.parse(mes.data) as PublishMessage;
      if (channel && message) {
        this.callHandlers(channel, message);
      }
    });
    return deferred.promise;
  }

  /**
   * Performs closing the connection.
   * @param code close code
   */
  disconnect(code?: number): void {
    if (this.websocketStream) {
      this.websocketStream.close(code ? code : undefined);
    }
  }

  /**
   * Adds a listener on an event.
   * @param  channel
   * @param  handler
   */
  addListener(channel: string, handler: Function): void {
    if (!this.handlers[channel]) {
      this.handlers[channel] = [];
    }
    this.handlers[channel].push(handler);
  }

  /**
   * Removes a listener.
   * @param event
   * @param handler
   */
  removeListener(event: string, handler: Function): void {
    if (this.handlers[event] && handler) {
      const index = this.handlers[event].indexOf(handler);
      if (index !== -1) {
        this.handlers[event].splice(index, 1);
      }
    }
  }

  private sleep(ms: number): Promise<any> {
    return new Promise<any>(resolve => setTimeout(resolve, ms));
  }

  /**
   * Sends pointed data.
   * @param data to be sent
   */
  async subscribe(data: SubscribeMessage): Promise<void> {
    while (this.websocketStream.readyState !== this.websocketStream.OPEN) {
      await this.sleep(1000);
    }

    const token = KeycloakAuthService?.keycloak?.token;
    if (!data.params.token && token) {
      data.params.token = token;
    }

    return this.websocketStream.send(JSON.stringify(data));
  }

  private callHandlers(channel: string, data: any): void {
    if (this.handlers[channel] && this.handlers[channel].length > 0) {
      this.handlers[channel].forEach((handler: Function) => handler(data));
    }
  }
}
