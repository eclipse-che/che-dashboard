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
import { FastifyInstance } from 'fastify';
import fastifyHttpProxy from 'fastify-http-proxy';

export function registerCheServerApiProxy(server: FastifyInstance, cheApiUpstream: string, origin: string) {
  console.log(`Che Server API proxy is running and proxying to "${cheApiUpstream}".`);

  server.register(fastifyHttpProxy, {
    upstream: cheApiUpstream,
    prefix: '/api',
    rewritePrefix: '/api',
    disableCache: true,
    websocket: false,
    replyOptions: {
      rewriteRequestHeaders: (originalReq, headers) => {
        return Object.assign({ ...headers }, { origin });
      }
    }
  });

  server.register(fastifyHttpProxy, {
    upstream: cheApiUpstream,
    prefix: '/auth',
    rewritePrefix: '/auth',
    disableCache: true,
    websocket: false,
    replyOptions: {
      rewriteRequestHeaders: (originalReq, headers) => {
        return Object.assign({ ...headers }, { origin });
      }
    }
  });
}
