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
import args from 'args';
import { registerStaticServer } from './static';
import { registerDevworkspaceWebsocketWatcher } from './api/devworkspaceWebsocketWatcher';
import { registerDevworkspaceApi } from './api/devworkspaceApi';
import { registerCheApi } from './api/cheApi';
import { registerTemplateApi } from './api/templateApi';
import { registerCheServerApiProxy } from './cheServerApiProxy';
import { registerCors } from './cors';
import { registerSwagger } from './swagger';

args
  .option('publicFolder', 'The public folder to serve', './public')
  .option('cheApiUpstream', 'The upstream for Che server api', process.env.CHE_HOST);

const { publicFolder, cheApiUpstream } = args.parse(process.argv) as { publicFolder: string, cheApiUpstream: string };

if (!('CHE_HOST' in process.env)) {
  console.error('CHE_HOST environment variable is required');
  process.exit(1);
}

const server = fastify();

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

registerCors(server);

registerStaticServer(publicFolder, server);

const enableSwagger = process.env.ENABLE_SWAGGER === 'true';
if (enableSwagger) {
  registerSwagger(server);
}

registerDevworkspaceApi(server);

registerDevworkspaceWebsocketWatcher(server);

registerTemplateApi(server);

registerCheApi(server);

const host = process.env.CHE_HOST as string;
if (cheApiUpstream && cheApiUpstream !== host) {
  registerCheServerApiProxy(server, cheApiUpstream, host);
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
