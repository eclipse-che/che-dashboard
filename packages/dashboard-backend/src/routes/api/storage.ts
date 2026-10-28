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

import { WorkspaceStorageResizeRequest } from '@eclipse-che/common';
import { FastifyInstance, FastifyRequest } from 'fastify';

import { baseApiPath } from '@/constants/config';
import { WorkspaceStorageApiService } from '@/devworkspaceClient/services/storageApi';
import { restParams } from '@/models';
import { getDevWorkspaceClient } from '@/routes/api/helpers/getDevWorkspaceClient';
import { getServiceAccountToken } from '@/routes/api/helpers/getServiceAccountToken';
import { getToken } from '@/routes/api/helpers/getToken';
import { getSchema } from '@/services/helpers';
import { KubeConfigProvider } from '@/services/kubeclient/kubeConfigProvider';
import { logger } from '@/utils/logger';

const tags = ['Workspace Storage'];

interface IStorageParams extends restParams.INamespacedParams {
  workspaceName: string;
}

interface IQuotaQuery {
  size: string;
}

const storageParamsSchema = {
  type: 'object',
  required: ['namespace', 'workspaceName'],
  properties: {
    namespace: { type: 'string' },
    workspaceName: { type: 'string' },
  },
} as const;

const quotaQuerySchema = {
  type: 'object',
  required: ['size'],
  properties: {
    size: { type: 'string', minLength: 1 },
  },
} as const;

const resizeBodySchema = {
  type: 'object',
  required: ['size'],
  properties: {
    size: { type: 'string', minLength: 1 },
  },
  examples: [{ size: '15Gi' }],
} as const;

function createStorageApiService(request: FastifyRequest): WorkspaceStorageApiService {
  const kubeConfigProvider = new KubeConfigProvider();
  const userKubeConfig = kubeConfigProvider.getKubeConfig(getToken(request));
  return new WorkspaceStorageApiService(userKubeConfig);
}

export const DEFAULT_STRATEGY_CACHE_TTL_MS = 60 * 1000;

let defaultStrategyCache: { value: string | undefined; expiresAt: number } | undefined;

export function clearDefaultStrategyCache(): void {
  defaultStrategyCache = undefined;
}

/**
 * Returns the default PVC strategy of the CheCluster, or `undefined` if it can't be read.
 * Cached, as the Storage tab polls and the CheCluster is listed cluster-wide.
 */
async function getDefaultStrategy(): Promise<string | undefined> {
  if (defaultStrategyCache && defaultStrategyCache.expiresAt > Date.now()) {
    return defaultStrategyCache.value;
  }
  let value: string | undefined;
  try {
    const { serverConfigApi } = getDevWorkspaceClient(getServiceAccountToken());
    const cheCustomResource = await serverConfigApi.fetchCheCustomResource();
    value = serverConfigApi.getPvcStrategy(cheCustomResource) || undefined;
  } catch (e) {
    logger.warn(e, 'Unable to read the default PVC strategy');
  }
  defaultStrategyCache = { value, expiresAt: Date.now() + DEFAULT_STRATEGY_CACHE_TTL_MS };
  return value;
}

export function registerStorageRoutes(instance: FastifyInstance) {
  instance.register(async server => {
    const path = `${baseApiPath}/namespace/:namespace/devworkspaces/:workspaceName/storage`;

    server.get(
      path,
      getSchema({ tags, params: storageParamsSchema }),
      async function (request: FastifyRequest) {
        const { namespace, workspaceName } = request.params as IStorageParams;
        const storageApi = createStorageApiService(request);
        return storageApi.getInfo(namespace, workspaceName, await getDefaultStrategy());
      },
    );

    server.get(
      `${path}/usage`,
      getSchema({ tags, params: storageParamsSchema }),
      async function (request: FastifyRequest) {
        const { namespace, workspaceName } = request.params as IStorageParams;
        const storageApi = createStorageApiService(request);
        return storageApi.getUsage(namespace, workspaceName);
      },
    );

    server.get(
      `${path}/quota`,
      getSchema({ tags, params: storageParamsSchema, querystring: quotaQuerySchema }),
      async function (request: FastifyRequest) {
        const { namespace, workspaceName } = request.params as IStorageParams;
        const { size } = request.query as IQuotaQuery;
        const storageApi = createStorageApiService(request);
        return storageApi.checkQuota(namespace, workspaceName, size, await getDefaultStrategy());
      },
    );

    server.patch(
      path,
      getSchema({ tags, params: storageParamsSchema, body: resizeBodySchema }),
      async function (request: FastifyRequest) {
        const { namespace, workspaceName } = request.params as IStorageParams;
        const { size } = request.body as WorkspaceStorageResizeRequest;
        const storageApi = createStorageApiService(request);
        return storageApi.resize(namespace, workspaceName, size, await getDefaultStrategy());
      },
    );
  });
}
