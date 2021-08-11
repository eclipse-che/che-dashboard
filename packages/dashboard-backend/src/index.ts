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

import 'reflect-metadata';
import fastify, { FastifyRequest } from 'fastify';
import { baseApiPath } from './constants/config';
import { startStaticServer } from './staticServer';
import { startDevworkspaceWebsocketWatcher } from './api/devworkspaceWebsocketWatcher';
import { startDevworkspaceApi } from './api/devworkspaceApi';
import { startCheApi } from './api/cheApi';
import { startTemplateApi } from './api/templateApi';
import { DwClientProvider } from './services/kubeclient/dwClientProvider';
import { cheServerApiProxy } from './cheServerApiProxy';


if (!('CHE_HOST' in process.env)) {
  console.error('CHE_HOST environment variable is required');
  process.exit(1);
}

const dwClientProvider: DwClientProvider = new DwClientProvider();

const server = fastify();

server.register(require('fastify-cors'),
  (instance: any) => (req: any, callback: any) => {
  const regexp = new RegExp(baseApiPath);
    const corsOptions = regexp.test(instance.origin) ? {
      origin: [process.env.CHE_HOST],
      methods: ['GET', 'POST', 'PATCH', 'DELETE']
    } : {
      origin: false
    };
    callback(null, corsOptions);
  }
);

server.addContentTypeParser(
  'application/merge-patch+json',
  { parseAs: 'string' },
  function(req, body, done) {
    try {
      const json = JSON.parse(body as string);
      done(null, json);
    } catch (err) {
      err.statusCode = 400;
      done(err, undefined);
    }
  }
);

startStaticServer(server);

startDevworkspaceApi(server);

startDevworkspaceWebsocketWatcher(server);

startTemplateApi(server);

startCheApi(server);

cheServerApiProxy(server);

server.listen(8080, '0.0.0.0', (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});

server.ready(() => {
  console.log(server.printRoutes());
});

/**
 * Creates DevWorkspace Client depending on the context for the specified request.
 */
export function getDevWorkspaceClient(request: FastifyRequest) {
  console.log(request.headers);
  return dwClientProvider.getDWClient(`${request.headers!.Authorization}`);
}
