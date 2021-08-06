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
import { initialize } from './nodeConfig';
import { baseApiPath } from './constants/config';
import { startStaticServer } from './staticServer';
import { startDevworkspaceWebsocketWatcher } from './api/devworkspaceWebsocketWatcher';
import { startDevworkspaceApi } from './api/devworkspaceApi';
import { startCheApi } from './api/cheApi';
import { startTemplateApi } from './api/templateApi';
import {DwClientProvider} from './services/kubeclient/dwClientProvider';

// todo add detection for openshift or kubernetes, we can probably just expose the devworkspace-client api to get that done for us
// todo add service account for kubernetes with all the needed permissions
// todo make it work on kubernetes

// initialize the server and exit if any needed environment variables aren't found
initialize();

const dwClientProvider: DwClientProvider = new DwClientProvider();

export function getApiObj(request: FastifyRequest) {
  return dwClientProvider.getDWClient(`${request.headers!.authentication}`);
}

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
