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

import { baseApiPath } from '@/constants/config';
import { getDevWorkspaceClient } from '@/routes/api/helpers/getDevWorkspaceClient';
import { getServiceAccountToken } from '@/routes/api/helpers/getServiceAccountToken';
import { getSchema } from '@/services/helpers';

const tags = ['Air Gapped sample'];

export function registerAirGappedSampleRoute(instance: FastifyInstance) {
  instance.register(async server => {
    server.get(`${baseApiPath}/airgap-sample`, getSchema({ tags }), async () => {
      const token = getServiceAccountToken();
      const { gettingAirGappedSampleApi } = getDevWorkspaceClient(token);
      return gettingAirGappedSampleApi.list();
    });

    server.get(
      `${baseApiPath}/airgap-sample/project/download`,
      getSchema({ tags }),
      async function (request: FastifyRequest, reply: FastifyReply) {
        const name = (request.query as { name: string })['name'];
        if (!name) {
          return reply.status(400).send('Sample name is required.');
        }

        const token = getServiceAccountToken();
        const { gettingAirGappedSampleApi } = getDevWorkspaceClient(token);

        const decodedName = decodeURIComponent(name);
        try {
          const project = await gettingAirGappedSampleApi.download(decodedName);
          reply.header('Content-Type', 'application/octet-stream');
          reply.header('Content-Length', project.size);
          return reply.send(project.stream);
        } catch (err) {
          console.error(`Error downloading project ${decodedName}`, err);
          return reply.status(500).send(`Error downloading project ${decodedName}`);
        }
      },
    );
  });
}
