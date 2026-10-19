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

import { baseApiPath } from '@/constants/config';
import {
  namespacedSandboxSchema,
  namespacedSchema,
  sandboxBodySchema,
  sandboxPatchSchema,
} from '@/constants/schemas';
import { ISandbox } from '@/devworkspaceClient/types';
import { restParams } from '@/models';
import { getDevWorkspaceClient } from '@/routes/api/helpers/getDevWorkspaceClient';
import { getServiceAccountToken } from '@/routes/api/helpers/getServiceAccountToken';
import { getToken } from '@/routes/api/helpers/getToken';
import { getSchema } from '@/services/helpers';

const tags = ['Sandbox'];

/**
 * Reads `spec.agentSandbox.enabled` off the CheCluster CR, which only the
 * service account may see. A CR that cannot be read is treated as "not
 * enabled": the probe decides whether a feature is offered, so failing closed
 * is the safe direction.
 */
async function isAgentSandboxEnabled(): Promise<boolean> {
  try {
    const { serverConfigApi } = getDevWorkspaceClient(getServiceAccountToken());
    return serverConfigApi.getAgentSandboxEnabled(await serverConfigApi.fetchCheCustomResource());
  } catch {
    return false;
  }
}

export function registerSandboxesRoutes(instance: FastifyInstance) {
  instance.register(async server => {
    server.get(
      `${baseApiPath}/sandboxes/available`,
      getSchema({
        tags,
        response: {
          200: {
            description: 'Whether the Agent Sandbox API is served by the cluster',
            type: 'object',
            properties: {
              available: { type: 'boolean' },
            },
          },
        },
      }),
      async function (request: FastifyRequest) {
        // `agentSandbox.enabled` is the administrator's switch for the whole
        // feature, so it has to be answered here and not only in the masthead:
        // the Agent Space bundle ships in every image and asks this route
        // before it talks to the cluster, whichever way the user reached it.
        if (!(await isAgentSandboxEnabled())) {
          return { available: false };
        }

        const token = getToken(request);
        const { sandboxApi } = getDevWorkspaceClient(token);
        return { available: await sandboxApi.isAvailable() };
      },
    );

    server.get(
      `${baseApiPath}/namespace/:namespace/sandboxes`,
      getSchema({ tags, params: namespacedSchema }),
      async function (request: FastifyRequest) {
        const { namespace } = request.params as restParams.INamespacedParams;
        const token = getToken(request);
        const { sandboxApi } = getDevWorkspaceClient(token);
        return sandboxApi.listInNamespace(namespace);
      },
    );

    server.get(
      `${baseApiPath}/namespace/:namespace/sandboxes/:sandboxName`,
      getSchema({ tags, params: namespacedSandboxSchema }),
      async function (request: FastifyRequest) {
        const { namespace, sandboxName } = request.params as restParams.INamespacedSandboxParams;
        const token = getToken(request);
        const { sandboxApi } = getDevWorkspaceClient(token);
        return sandboxApi.getByName(namespace, sandboxName);
      },
    );

    server.post(
      `${baseApiPath}/namespace/:namespace/sandboxes`,
      getSchema({ tags, params: namespacedSchema, body: sandboxBodySchema }),
      async function (request: FastifyRequest) {
        const { namespace } = request.params as restParams.INamespacedParams;
        const sandbox = request.body as ISandbox;
        const token = getToken(request);
        const { sandboxApi } = getDevWorkspaceClient(token);
        return sandboxApi.create(namespace, sandbox);
      },
    );

    server.patch(
      `${baseApiPath}/namespace/:namespace/sandboxes/:sandboxName`,
      getSchema({ tags, params: namespacedSandboxSchema, body: sandboxPatchSchema }),
      async function (request: FastifyRequest) {
        const { namespace, sandboxName } = request.params as restParams.INamespacedSandboxParams;
        const patch = request.body as Record<string, unknown>;
        const token = getToken(request);
        const { sandboxApi } = getDevWorkspaceClient(token);
        return sandboxApi.patch(namespace, sandboxName, patch);
      },
    );

    server.delete(
      `${baseApiPath}/namespace/:namespace/sandboxes/:sandboxName`,
      getSchema({
        tags,
        params: namespacedSandboxSchema,
        response: {
          204: {
            description: 'The Sandbox successfully deleted',
            type: 'null',
          },
        },
      }),
      async function (request: FastifyRequest, reply: FastifyReply) {
        const { namespace, sandboxName } = request.params as restParams.INamespacedSandboxParams;
        const token = getToken(request);
        const { sandboxApi } = getDevWorkspaceClient(token);

        await sandboxApi.delete(namespace, sandboxName);

        reply.code(204).send();
      },
    );
  });
}
