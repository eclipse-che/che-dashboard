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
  deviceAuthPollBodySchema,
  deviceAuthTokenParamsSchema,
  namespacedSchema,
} from '@/constants/schemas';
import { restParams } from '@/models';
import { getDevWorkspaceClient } from '@/routes/api/helpers/getDevWorkspaceClient';
import { getToken } from '@/routes/api/helpers/getToken';
import { getSchema } from '@/services/helpers';

const tags = ['Device Auth Token'];
const rateLimitConfig = {
  config: {
    rateLimit: {
      max: 100,
      timeWindow: '1 minute',
    },
  },
};

export function registerDeviceAuthTokenRoutes(instance: FastifyInstance) {
  instance.register(async server => {
    /**
     * GET /dashboard/api/namespace/:namespace/device-auth-token
     * Returns metadata of Device Authentication token secrets in the namespace
     * (identified by the che.eclipse.org/device-authentication=true label).
     * Uses user bearer token.
     */
    server.get(
      `${baseApiPath}/namespace/:namespace/device-auth-token`,
      Object.assign({}, rateLimitConfig, getSchema({ tags, params: namespacedSchema })),
      async function (request: FastifyRequest) {
        const { namespace } = request.params as restParams.INamespacedParams;
        const token = getToken(request);
        const { deviceAuthTokenApi } = getDevWorkspaceClient(token);
        return deviceAuthTokenApi.listTokens(namespace);
      },
    );

    /**
     * DELETE /dashboard/api/namespace/:namespace/device-auth-token/:tokenName
     * Deletes the Device Authentication token secret by name.
     * Uses user bearer token.
     */
    server.delete(
      `${baseApiPath}/namespace/:namespace/device-auth-token/:tokenName`,
      Object.assign({}, rateLimitConfig, getSchema({ tags, params: deviceAuthTokenParamsSchema })),
      async function (request: FastifyRequest, reply: FastifyReply) {
        const { namespace, tokenName } =
          request.params as restParams.DeviceAuthTokenNamespacedParams;
        const token = getToken(request);
        const { deviceAuthTokenApi } = getDevWorkspaceClient(token);
        await deviceAuthTokenApi.deleteToken(namespace, tokenName);
        reply.code(204).send();
      },
    );

    /**
     * POST /dashboard/api/namespace/:namespace/device-auth-token/initiate
     * Calls GitHub to obtain a device code. Requires CHE_GITHUB_OAUTH_CLIENT_ID env var.
     * Uses user bearer token for auth.
     */
    server.post(
      `${baseApiPath}/namespace/:namespace/device-auth-token/initiate`,
      {
        ...getSchema({ tags, params: namespacedSchema }),
        config: {
          rateLimit: {
            max: 100,
            timeWindow: '1 minute',
          },
        },
      },
      async function (request: FastifyRequest) {
        const token = getToken(request);
        const { deviceAuthTokenApi } = getDevWorkspaceClient(token);
        return deviceAuthTokenApi.initiateDeviceAuth();
      },
    );

    /**
     * POST /dashboard/api/namespace/:namespace/device-auth-token/poll
     * Polls GitHub for a device code exchange. On success, creates the K8s secret.
     * Uses user bearer token for auth.
     */
    server.post(
      `${baseApiPath}/namespace/:namespace/device-auth-token/poll`,
      {
        ...rateLimitConfig,
        ...getSchema({ tags, params: namespacedSchema, body: deviceAuthPollBodySchema }),
      },
      async function (request: FastifyRequest) {
        const { namespace } = request.params as restParams.INamespacedParams;
        const { deviceCode } = request.body as { deviceCode: string };
        const token = getToken(request);
        const { deviceAuthTokenApi } = getDevWorkspaceClient(token);
        return deviceAuthTokenApi.pollDeviceAuth(namespace, deviceCode);
      },
    );
  });
}
