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

import { IStreamedFile } from '@eclipse-che/common/lib/dto/api';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { baseApiPath } from '@/constants/config';
import { getDevWorkspaceClient } from '@/routes/api/helpers/getDevWorkspaceClient';
import { getServiceAccountToken } from '@/routes/api/helpers/getServiceAccountToken';
import { getSchema } from '@/services/helpers';

const tags = ['Air Gapped sample'];

export function registerAirGapSampleRoute(instance: FastifyInstance) {
  instance.register(async server => {
    server.get(`${baseApiPath}/airgap-sample`, getSchema({ tags }), async () => {
      const token = getServiceAccountToken();
      const { gettingAirGapSampleApi } = getDevWorkspaceClient(token);
      return gettingAirGapSampleApi.list();
    });

    server.get(
      `${baseApiPath}/airgap-sample/devfile/download`,
      getSchema({ tags }),
      async function (request: FastifyRequest, reply: FastifyReply) {
        const name = (request.query as { name: string })['name'];

        const token = getServiceAccountToken();
        const { gettingAirGapSampleApi } = getDevWorkspaceClient(token);

        return downloadFile(name, reply, gettingAirGapSampleApi.downloadDevfile);
      },
    );

    server.get(
      `${baseApiPath}/airgap-sample/project/download`,
      getSchema({ tags }),
      async function (request: FastifyRequest, reply: FastifyReply) {
        const name = (request.query as { name: string })['name'];

        const token = getServiceAccountToken();
        const { gettingAirGapSampleApi } = getDevWorkspaceClient(token);

        return downloadFile(name, reply, gettingAirGapSampleApi.downloadProject);
      },
    );
  });
}

async function downloadFile(
  name: string,
  reply: FastifyReply,
  downloadFile: (name: string) => Promise<IStreamedFile>,
): Promise<any> {
  if (!name) {
    return reply.status(400).send('Sample name is required.');
  }

  const decodedName = decodeURIComponent(name);
  try {
    const project = await downloadFile(decodedName);
    reply.header('Content-Type', 'application/octet-stream');
    reply.header('Content-Length', project.size);
    return reply.send(project.stream);
  } catch (err) {
    console.error(`Error downloading file`, err);
    return reply.status(500).send(`Error downloading file`);
  }
}
