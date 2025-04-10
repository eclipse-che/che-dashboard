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
import { dump } from 'js-yaml';

import { baseApiPath } from '@/constants/config';
import { authenticationHeaderSchema } from '@/constants/schemas';
import { EditorNotFoundError } from '@/devworkspaceClient/services/editorsApi';
import { IEditorsDevfileParams } from '@/models/restParams';
import { getDevWorkspaceClient } from '@/routes/api/helpers/getDevWorkspaceClient';
import { getServiceAccountToken } from '@/routes/api/helpers/getServiceAccountToken';
import { getSchema } from '@/services/helpers';

const tags = ['Editor Definitions'];

export function registerEditorsRoutes(instance: FastifyInstance) {
  instance.register(async server => {
    server.get(`${baseApiPath}/editors`, getSchema({ tags }), async () => {
      const token = getServiceAccountToken();
      const { editorsApi } = getDevWorkspaceClient(token);

      return editorsApi.list();
    });

    server.route({
      method: 'GET',
      url: `${baseApiPath}/editors/devfile`,
      schema: {
        headers: authenticationHeaderSchema,
        tags,
        querystring: {
          type: 'object',
          required: ['che-editor'],
          properties: {
            'che-editor': {
              type: 'string',
            },
          },
        },
      },
      async handler(request: FastifyRequest, reply: FastifyReply) {
        const editorId = (request.query as IEditorsDevfileParams)['che-editor'];

        if (!editorId) {
          return reply.status(400).send('The che-editor query parameter is required');
        }

        const token = getServiceAccountToken();
        const { editorsApi } = getDevWorkspaceClient(token);
        let editor;
        try {
          editor = await editorsApi.get(editorId);
        } catch (error) {
          if (error instanceof EditorNotFoundError) {
            return reply.status(404).send(error);
          }
          throw error;
        }

        return dump(editor);
      },
    });
  });
}
