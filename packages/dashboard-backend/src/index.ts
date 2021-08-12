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
import fastify from 'fastify';
import fastifyCors from 'fastify-cors';
import { startStaticServer } from './staticServer';
import { startDevworkspaceWebsocketWatcher } from './api/devworkspaceWebsocketWatcher';
import { startDevworkspaceApi } from './api/devworkspaceApi';
import { startCheApi } from './api/cheApi';
import { startTemplateApi } from './api/templateApi';
import { cheServerApiProxy } from './cheServerApiProxy';
import args from 'args';

args
  .option('publicFolder', 'The public folder to serve', './public')
  .option('cheServerUpstream', 'The upstream for Che server api', process.env.CHE_HOST);

const { publicFolder, cheApiUpstream } = args.parse(process.argv) as { publicFolder: string, cheApiUpstream: string };

if (!('CHE_HOST' in process.env)) {
  console.error('CHE_HOST environment variable is required');
  process.exit(1);
}

const server = fastify();

// todo replace an 'any' with the target type
server.register(fastifyCors, () => (req: any, callback: any) => {
    const corsOptions = /^(https?:\/\/)?localhost:8080/.test(req.headers.host) ? {
      origin: false
    } : {
      origin: [process.env.CHE_HOST],
      methods: ['GET', 'POST', 'PATCH', 'DELETE']
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

startStaticServer(publicFolder, server);

startDevworkspaceApi(server);

startDevworkspaceWebsocketWatcher(server);

startTemplateApi(server);

startCheApi(server);


const origin = process.env.CHE_HOST;
if (cheApiUpstream && cheApiUpstream !== origin) {
  cheServerApiProxy(cheApiUpstream, server);
}

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
