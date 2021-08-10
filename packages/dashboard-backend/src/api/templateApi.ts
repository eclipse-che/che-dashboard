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
import { templateStartedBody } from '../constants/schemas';
import { getDevWorkspaceClient } from '../index';
import { getSchema } from '../services/helpers';

export function startTemplateApi(server: FastifyInstance) {

  server.post(
    `${baseApiPath}/template`,
    getSchema({ body: templateStartedBody }),
    async (request: FastifyRequest) => {
      const { template } = request.body as models.TemplateStartedBody;
      const { templateApi } = await getDevWorkspaceClient(request);

      return templateApi.create(template);
    }
  );
}
