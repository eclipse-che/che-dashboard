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

import { FastifyInstance, FastifyRequest, RouteShorthandOptions } from 'fastify';
import { baseApiPath } from '../constants/config';
import SubscribeManager, { Subscriber } from '../services/SubscriptionManager';

const options = { websocket: true } as RouteShorthandOptions;

function hendler(connection: FastifyRequest) {
  const subscriber: Subscriber = connection.socket as any;
  const pubSubManager = new SubscribeManager(subscriber);
  connection.socket.on('message', message => {
    const { request, params, channel } = JSON.parse(message);
    if (!request || !channel) {
      return;
    }
    switch (request) {
      case 'UNSUBSCRIBE':
        pubSubManager.unsubscribe(channel);
        break;
      case 'SUBSCRIBE':
        pubSubManager.subscribe(channel, params as { token: string, namespace: string });
        break;
    }
  })
}

export function startDevworkspaceWebsocketWatcher(server: FastifyInstance) {
  server.register(require('fastify-websocket'));
  server.get(`${baseApiPath}/websocket`, options, hendler);
}
