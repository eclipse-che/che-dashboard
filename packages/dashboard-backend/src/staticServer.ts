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
import { FastifyInstance } from 'fastify';
import fastifyStatic from 'fastify-static';
import path from 'path';

args
  .option('publicFolder', 'The public folder to serve', './public')
  .option('cheServerUpstream', 'The upstream for che-server api', process.env.CHE_HOST)

const { publicFolder } = args.parse(process.argv) as { publicFolder: string };
const rootPath = path.resolve(__dirname, publicFolder);

export function startStaticServer(server: FastifyInstance) {

  console.log(`I'll serve "${rootPath}" on 0.0.0.0:8080`);

  server.register(fastifyStatic, {
    root: rootPath,
    maxAge: 24 * 60 * 60 * 1000,
    lastModified: true,
    prefix: '/dashboard/',
  });
  server.get('/', async (request, reply) => {
    reply.code(204);
    return reply.send();
  });
}
