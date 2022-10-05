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
import fastifyHttpProxy from '@fastify/http-proxy';
import { stubCheServerOptionsRequests } from '../hooks/stubCheServerOptionsRequests';

export function registerCheApiProxy(
  server: FastifyInstance,
  cheApiProxyUpstream: string,
  origin: string,
) {
  console.log(`Dashboard proxies requests to Che Server API on ${cheApiProxyUpstream}/api.`);
  // server api
  server.register(fastifyHttpProxy, {
    upstream: cheApiProxyUpstream ? cheApiProxyUpstream : origin,
    prefix: '/api/',
    rewritePrefix: '/api/',
    disableCache: true,
    websocket: false,
    replyOptions: {
      rewriteRequestHeaders: (originalReq, headers) => {
        const clusterAccessToken = process.env.CLUSTER_ACCESS_TOKEN as string;
        if (clusterAccessToken) {
          headers.authorization = 'Bearer ' + clusterAccessToken;
        }
        return Object.assign({ ...headers }, { origin });
      },
    },
  });
  stubCheServerOptionsRequests(server);
}
