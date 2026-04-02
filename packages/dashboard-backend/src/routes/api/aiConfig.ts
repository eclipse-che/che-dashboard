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
  aiProviderKeyBodySchema,
  aiProviderKeyParamsSchema,
  namespacedSchema,
} from '@/constants/schemas';
import { restParams } from '@/models';
import { getDevWorkspaceClient } from '@/routes/api/helpers/getDevWorkspaceClient';
import { getServiceAccountToken } from '@/routes/api/helpers/getServiceAccountToken';
import { getToken } from '@/routes/api/helpers/getToken';
import { getSchema } from '@/services/helpers';

const tags = ['AI Config'];
const rateLimitConfig = {
  config: {
    rateLimit: {
      max: 30,
      timeWindow: '1 minute',
    },
  },
};

export function registerAiConfigRoutes(instance: FastifyInstance) {
  instance.register(async server => {
    /**
     * GET /dashboard/api/namespace/:namespace/ai-provider-key
     * Returns provider IDs that have a key Secret in the given namespace.
     * Uses user bearer token.
     */
    server.get(
      `${baseApiPath}/namespace/:namespace/ai-provider-key`,
      Object.assign({}, rateLimitConfig, getSchema({ tags, params: namespacedSchema })),
      async function (request: FastifyRequest) {
        const { namespace } = request.params as restParams.INamespacedParams;
        // Fetch provider definitions to enable detection of manually-created secrets
        // (e.g. created via CLI following the demo-repo pattern, without our custom label).
        const serviceToken = getServiceAccountToken();
        const { serverConfigApi } = getDevWorkspaceClient(serviceToken);
        const cheCustomResource = await serverConfigApi.fetchCheCustomResource();
        const tools = serverConfigApi.getAiTools(cheCustomResource);
        const token = getToken(request);
        const { aiProviderKeyApi } = getDevWorkspaceClient(token);
        return aiProviderKeyApi.listProviderIdsWithKey(namespace, tools);
      },
    );

    /**
     * POST /dashboard/api/namespace/:namespace/ai-provider-key
     * Creates or replaces the API key Secret for a provider.
     * Uses user bearer token.
     */
    server.post(
      `${baseApiPath}/namespace/:namespace/ai-provider-key`,
      Object.assign(
        {},
        rateLimitConfig,
        getSchema({ tags, params: namespacedSchema, body: aiProviderKeyBodySchema }),
      ),
      async function (request: FastifyRequest, reply: FastifyReply) {
        const { namespace } = request.params as restParams.INamespacedParams;
        const { toolId, apiKey } = request.body as restParams.AiProviderKeyBody;
        const serviceToken = getServiceAccountToken();
        const { serverConfigApi } = getDevWorkspaceClient(serviceToken);
        const cheCluster = await serverConfigApi.fetchCheCustomResource();
        const tools = serverConfigApi.getAiTools(cheCluster);
        const tool = tools.find(t => t.id === toolId);
        if (!tool) {
          reply.code(404).send({ message: `AI tool '${toolId}' not found in server config` });
          return;
        }
        if (!tool.envVarName) {
          reply.code(400).send({ message: `AI tool '${toolId}' does not require an API key` });
          return;
        }
        const token = getToken(request);
        const { aiProviderKeyApi } = getDevWorkspaceClient(token);
        await aiProviderKeyApi.createOrReplace(namespace, toolId, apiKey, tool.envVarName);
        return { toolId };
      },
    );

    /**
     * DELETE /dashboard/api/namespace/:namespace/ai-provider-key/:toolId
     * Deletes the API key Secret for the given provider.
     * Uses user bearer token.
     */
    server.delete(
      `${baseApiPath}/namespace/:namespace/ai-provider-key/:toolId`,
      Object.assign({}, rateLimitConfig, getSchema({ tags, params: aiProviderKeyParamsSchema })),
      async function (request: FastifyRequest, reply: FastifyReply) {
        const { namespace, toolId } = request.params as restParams.AiProviderKeyNamespacedParams;
        // Look up the tool to get envVarName for fallback deletion of manually-created secrets.
        const serviceToken = getServiceAccountToken();
        const { serverConfigApi } = getDevWorkspaceClient(serviceToken);
        const cheCluster = await serverConfigApi.fetchCheCustomResource();
        const tools = serverConfigApi.getAiTools(cheCluster);
        const tool = tools.find(t => t.id === toolId);
        const token = getToken(request);
        const { aiProviderKeyApi } = getDevWorkspaceClient(token);
        await aiProviderKeyApi.delete(namespace, toolId, tool?.envVarName);
        reply.code(204).send();
      },
    );
  });
}
