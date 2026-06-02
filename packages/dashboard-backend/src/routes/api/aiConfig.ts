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
import { getToken } from '@/routes/api/helpers/getToken';
import { getSchema } from '@/services/helpers';

const tags = ['AI Config'];
const rateLimitConfig = {
  config: {
    rateLimit: {
      max: 100,
      timeWindow: '1 minute',
    },
  },
};

export function registerAiConfigRoutes(instance: FastifyInstance) {
  instance.register(async server => {
    /**
     * GET /dashboard/api/namespace/:namespace/ai-provider-key
     * Returns sanitized provider IDs that have a dashboard-managed key Secret
     * (identified by the che.eclipse.org/ai-provider-id label) in the namespace.
     * Uses user bearer token.
     */
    server.get(
      `${baseApiPath}/namespace/:namespace/ai-provider-key`,
      Object.assign({}, rateLimitConfig, getSchema({ tags, params: namespacedSchema })),
      async function (request: FastifyRequest) {
        const { namespace } = request.params as restParams.INamespacedParams;
        const token = getToken(request);
        const { aiProviderKeyApi } = getDevWorkspaceClient(token);
        return aiProviderKeyApi.listProviderIdsWithKey(namespace);
      },
    );

    /**
     * POST /dashboard/api/namespace/:namespace/ai-provider-key
     * Creates or replaces the API key Secret for a provider.
     * The client supplies envVarName (e.g. GEMINI_API_KEY) which it already
     * knows from the tool registry — no server-side CR lookup needed.
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
        const { toolId, envVarName, apiKey } = request.body as restParams.AiProviderKeyBody;
        const token = getToken(request);
        const { aiProviderKeyApi } = getDevWorkspaceClient(token);
        await aiProviderKeyApi.createOrReplace(namespace, toolId, apiKey, envVarName);
        reply.code(201).send({ toolId });
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
        const token = getToken(request);
        const { aiProviderKeyApi } = getDevWorkspaceClient(token);
        await aiProviderKeyApi.delete(namespace, toolId);
        reply.code(204).send();
      },
    );
  });
}
