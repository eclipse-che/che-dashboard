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

import { FastifyInstance, FastifyRequest } from 'fastify';
import { baseApiPath } from '../constants/config';
import { namespacedSchema } from '../constants/schemas';
import { getDevWorkspaceClient } from './helper';
import { getSchema } from '../services/helpers';
import { restParams } from '../typings/models';

const tags = ['namespace'];

export function registerCheApi(server: FastifyInstance) {
  server.get(
    `${baseApiPath}/namespace/:namespace/init`,
    getSchema({ tags,
      params: namespacedSchema,
      response: {
        204: {
          description: 'The server has successfully fulfilled the request',
          type: 'null'
        }
      }
    }),
    async (request: FastifyRequest) => {
      const {namespace} = request.params as restParams.INamespacedParam;
      const {cheApi} = await getDevWorkspaceClient(request);
      // For some reason it couldn't work with status successful response codes 202, 204.
      // So, return null for successful response codes 200.
      try {
        await cheApi.initializeNamespace(namespace);
      } catch (e) {
        return Promise.reject(e);
      }
      return Promise.resolve(null);
    }
  );
}
