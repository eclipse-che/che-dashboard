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
import { getApiObj } from '../index';
import { getSchema } from '../services/helpers';

export function startCheApi(server: FastifyInstance) {

  server.get(
    `${baseApiPath}/namespace/:namespace/init`,
    getSchema({ params: namespacedSchema }),
    async (request: FastifyRequest) => {
      const { namespace } = request.params as models.NamespacedWorkspaceParam;
      const { cheApi } = await getApiObj(request);
      try {
        await cheApi.initializeNamespace(namespace);
      } catch (e) {
        return Promise.reject(`Was not able to initialize the namespace '${namespace}'`);
      }
      return Promise.resolve(true);
    }
  );
}
