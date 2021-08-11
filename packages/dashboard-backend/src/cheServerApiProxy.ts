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
import args from 'args';
import {FastifyInstance, FastifyRequest, RouteShorthandOptions} from 'fastify';
import fastifyHttpProxy from 'fastify-http-proxy';

args.option('cheServerUpstream', 'The upstream for che-server api', process.env.CHE_HOST);

const upstream = (args.parse(process.argv) as { cheServerUpstream: string }).cheServerUpstream;

export function cheServerApiProxy(server: FastifyInstance) {
  const origin = process.env.CHE_HOST;
  if (upstream && upstream !== origin) {
    console.log(`I'll use che-server upstream "${upstream}".`);

    // todo replace this custom implementation for dummy responses with fastifyHttpProxy
    server.get(`/api/websocket`, {websocket: true} as RouteShorthandOptions, (connection: FastifyRequest) => {
      connection.socket.on('message', message => {
        const data = JSON.parse(message);
        if (data!.id && data!.jsonrpc) {
          (connection.socket as any).send(JSON.stringify({jsonrpc: data.jsonrpc, id: data.id, result: []}));
        }
      });
    });
    // server.register(fastifyHttpProxy, {
    //   upstream: upstream.replace(/^http/, 'ws'),
    //   prefix: '/api/websocket',
    //   rewritePrefix: '/api/websocket',
    //   disableCache: true,
    //   websocket: true,
    //   replyOptions: {
    //     rewriteRequestHeaders: (originalReq, headers) => {
    //       return Object.assign({...headers}, { origin });
    //     }
    //   }
    // });

    server.register(fastifyHttpProxy, {
      upstream,
      prefix: '/api',
      rewritePrefix: '/api',
      disableCache: true,
      websocket: false,
      replyOptions: {
        rewriteRequestHeaders: (originalReq, headers) => {
          return Object.assign({...headers}, {origin});
        }
      }
    });
  }
}
