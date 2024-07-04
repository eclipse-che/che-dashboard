/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';

import { baseApiPath } from '@/constants/config';
import { getSchema } from '@/services/helpers';

const tags = ['Download sample'];

export function registerSampleRoutes(instance: FastifyInstance) {
  instance.register(async server => {
    server.get(
      `${baseApiPath}/sample/download`,
      getSchema({ tags }),
      async function (request: FastifyRequest, reply: FastifyReply) {
        const rootDir = '/public/dashboard/devfile-registry/samples';
        const sampleFileName = (request.query as { path: string })['path'];

        if (!sampleFileName) {
          return reply.status(400).send('The path query parameter is required');
        }

        if (!fs.existsSync(path.join(rootDir, sampleFileName))) {
          return reply.status(404).send(`File ${sampleFileName} not found`);
        }

        // TODO rework
        reply.sendFile(sampleFileName);
      },
    );
  });
}
