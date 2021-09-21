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
import { registerLocalServers } from './local-run';
import { registerCors } from './cors';
import { registerSwagger } from './swagger';
import { getMessage } from '@eclipse-che/common/lib/helpers/errors';
import { isLocalRun } from './local-run';

const CHE_HOST = process.env.CHE_HOST as string;

if (!CHE_HOST) {
  console.error('CHE_HOST environment variable is required');
  process.exit(1);
}

args
  .option('publicFolder', 'The public folder to serve', './public');

const { publicFolder } = args.parse(process.argv) as { publicFolder: string };

const server = fastify({
  logger: false,
});

server.addContentTypeParser(
  'application/merge-patch+json',
  { parseAs: 'string' },
  function(req, body, done) {
    try {
      const json = JSON.parse(body as string);
      done(null, json);
    } catch (e) {
      const error = new Error(getMessage(e));
      done(error, undefined);
    }
  }
);

registerStaticServer(publicFolder, server);

registerSwagger(server);

registerDevworkspaceApi(server);

registerDevworkspaceWebsocketWatcher(server);

registerTemplateApi(server);

registerCheApi(server);

registerCors(isLocalRun, server);
if (isLocalRun) {
  registerLocalServers(server, CHE_HOST);
}

server.listen(8080, '0.0.0.0', (err: Error, address: string) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});

server.ready(() => {
  console.log(server.printRoutes());
});
