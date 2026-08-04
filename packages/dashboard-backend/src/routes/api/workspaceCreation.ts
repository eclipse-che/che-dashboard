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

import { Main as DevworkspaceGenerator } from '@eclipse-che/che-devworkspace-generator/lib/main';
import { api } from '@eclipse-che/common';
import { FastifyInstance, FastifyRequest } from 'fastify';

import { baseApiPath } from '@/constants/config';
import { namespacedSchema, workspaceCreationSchema } from '@/constants/schemas';
import { axiosInstance } from '@/routes/api/helpers/getCertificateAuthority';
import { getDevWorkspaceClient } from '@/routes/api/helpers/getDevWorkspaceClient';
import { getToken } from '@/routes/api/helpers/getToken';
import { restParams } from '@/models';
import { getSchema } from '@/services/helpers';

const tags = ['Workspace Creation'];

export function registerWorkspaceCreationRoute(instance: FastifyInstance) {
  const generator = new DevworkspaceGenerator();

  instance.register(async server => {
    server.post(
      `${baseApiPath}/namespace/:namespace/workspace-creation`,
      getSchema({ tags, params: namespacedSchema, body: workspaceCreationSchema }),
      async function (request: FastifyRequest, reply) {
        const token = getToken(request);
        const { namespace } = request.params as restParams.INamespacedParams;
        const body = request.body as api.IWorkspaceCreationRequest;

        if (!body.devfileContent && !body.devfileUrl) {
          return reply.code(400).send({ message: 'Either devfileContent or devfileUrl must be provided' });
        }

        const context = await generator.generateDevfileContext(
          {
            devfileContent: body.devfileContent,
            devfileUrl: body.devfileUrl,
            editorPath: body.editorPath,
            editorContent: body.editorContent,
            projects: [],
          },
          axiosInstance,
        );

        const { devWorkspace, devWorkspaceTemplates } = context;

        devWorkspace.metadata.namespace = namespace;

        if (body.name) {
          devWorkspace.metadata.name = body.name;
        }

        devWorkspace.spec.started = false;

        if (body.attributes) {
          devWorkspace.spec.template = devWorkspace.spec.template || {};
          devWorkspace.spec.template.attributes = Object.assign(
            {},
            devWorkspace.spec.template.attributes,
            body.attributes,
          );
        }

        const dwClient = getDevWorkspaceClient(token);

        for (const template of devWorkspaceTemplates) {
          template.metadata.namespace = namespace;
          try {
            await dwClient.devWorkspaceTemplateApi.create(template);
          } catch (e: any) {
            if (e?.response?.statusCode === 409) {
              return reply.code(409).send({ message: 'Workspace template already exists' });
            }
            throw e;
          }
        }

        let createdWorkspace;
        try {
          const result = await dwClient.devworkspaceApi.create(devWorkspace, namespace);
          createdWorkspace = result.devWorkspace;
        } catch (e: any) {
          if (e?.response?.statusCode === 409) {
            return reply.code(409).send({ message: 'Workspace already exists' });
          }
          throw e;
        }

        return { devWorkspace: createdWorkspace } as api.IWorkspaceCreationResponse;
      },
    );
  });
}
