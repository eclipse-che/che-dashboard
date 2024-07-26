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
const airgapSamplesRootDir = '/public/dashboard/devfile-registry/devfiles/airgap-samples';

export function registerSampleRoutes(instance: FastifyInstance) {
  instance.register(async server => {
    server.get(
      `${baseApiPath}/airgap-sample/download`,
      getSchema({ tags }),
      async function (request: FastifyRequest, reply: FastifyReply) {
        const sampleFileName = (request.query as { filename: string })['filename'];
        if (!sampleFileName) {
          return reply.status(400).send("The 'filename' query parameter is required");
        }

        const sampleFilePath = path.join(airgapSamplesRootDir, sampleFileName);
        if (!fs.existsSync(sampleFilePath)) {
          return reply.status(404).send(`File not found: ${sampleFileName}`);
        }

        try {
          const stats = fs.statSync(sampleFilePath);
          const readStream = fs.createReadStream(sampleFilePath);

          reply.header('Content-Type', 'application/octet-stream');
          reply.header('Content-Length', stats.size);
          return reply.send(readStream);
        } catch (err) {
          console.error(`Error downloading sample file: ${sampleFilePath}`, err);
          return reply.status(500).send(`Error downloading file: ${sampleFileName}`);
        }
      },
    );
  });
}
