/*
 * Copyright (c) 2018-2026 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { helpers } from '@eclipse-che/common';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { baseApiPath } from '@/constants/config';
import { gitBranchSchema } from '@/constants/schemas';
import { restParams } from '@/models';
import { getBranches, GitClientError } from '@/services/gitClient';
import { getSchema } from '@/services/helpers';

const tags = ['GitBranches'];

export function registerGitBranchesRoute(instance: FastifyInstance) {
  instance.register(async server => {
    server.post(
      `${baseApiPath}/gitbranches`,
      getSchema({ tags, body: gitBranchSchema }),
      async function (request: FastifyRequest, reply: FastifyReply) {
        const { url } = request.body as restParams.IYamlResolverParams;
        try {
          return await getBranches(url);
        } catch (e) {
          const statusCode = e instanceof GitClientError ? e.statusCode : 500;
          reply.status(statusCode).send(helpers.errors.getMessage(e));
        }
      },
    );
  });
}
