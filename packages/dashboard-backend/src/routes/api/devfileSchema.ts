/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
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
import { JSONSchema7 } from 'json-schema';

import { baseApiPath } from '@/constants/config';
import { devfileVersionSchema } from '@/constants/schemas';
import * as devfileSchemaV200 from '@/devfileSchemas/2.0.0/devfile.json';
import * as devfileSchemaV210 from '@/devfileSchemas/2.1.0/devfile.json';
import * as devfileSchemaV220 from '@/devfileSchemas/2.2.0/devfile.json';
import * as devfileSchemaV230 from '@/devfileSchemas/2.3.0/devfile.json';
import { restParams } from '@/models';
import { getSchema } from '@/services/helpers';

const tags = ['Devfile'];

export function registerDevfileSchemaRoute(server: FastifyInstance) {
  server.get(
    `${baseApiPath}/devfile`,
    getSchema({ tags, query: devfileVersionSchema }),
    async function (
      request: FastifyRequest,
      reply: FastifyReply,
    ): Promise<JSONSchema7 | undefined> {
      const { version } = request.query as restParams.IDevfileVersionParams;
      switch (version) {
        case '2.0.0':
          return devfileSchemaV200 as unknown as JSONSchema7;
        case '2.1.0':
          return devfileSchemaV210 as unknown as JSONSchema7;
        case '2.2.0':
          return devfileSchemaV220 as unknown as JSONSchema7;
        case 'latest':
        case '2.3.0':
          return devfileSchemaV230 as unknown as JSONSchema7;
      }
      reply.code(404);
    },
  );
}
