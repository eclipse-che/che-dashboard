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

export function cheServerApiProxy(cheApiUpstream: string, server: FastifyInstance) {
    console.log(`Che Server API proxy is running and proxying to "${cheApiUpstream}".`);

    // fake JSON RPC for Che websocket API
    // because the real proxy fails to some reason
    // but since che workspace and devworkspace are not expected to work at the same time
    // faking is an easier solution
    server.get(`/api/websocket`, {websocket: true} as RouteShorthandOptions, (connection: FastifyRequest) => {
      connection.socket.on('message', message => {
        const data = JSON.parse(message);
        if (data!.id && data!.jsonrpc) {
          (connection.socket as any).send(JSON.stringify({jsonrpc: data.jsonrpc, id: data.id, result: []}));
        }
      });
    });

    server.register(fastifyHttpProxy, {
      upstream: cheApiUpstream,
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
