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

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { baseApiPath } from '../constants/config';
import { api } from '@eclipse-che/common';
import {
  dockerConfigSchema,
  namespacedDockerConfigSchema
} from '../constants/schemas';
import { getDevWorkspaceClient } from './helper';
import { restParams } from '../typings/models';
import { getSchema } from '../services/helpers';
import { V1Secret } from '@kubernetes/client-node/dist/gen/model/v1Secret';

const tags = ['dockerconfig'];

const secretName = 'devworkspace-container-registry-dockercfg';
const secretLabels = { 'controller.devfile.io/devworkspace_pullsecret': 'true' };

export function registerDockerConfigApi(server: FastifyInstance) {

  server.post(
    `${baseApiPath}/namespace/:namespace/dockerconfigs`,
    getSchema({ tags, params: namespacedDockerConfigSchema, body: dockerConfigSchema }),
    async function (request: FastifyRequest) {
      const { namespace } = request.params as restParams.INamespacedParam;
      const { dockerconfig } = request.body as restParams.ISecreteParams;
      const { secretApi } = await getDevWorkspaceClient(request);
      const body = createDockerConfigSecret(dockerconfig);
      const secret = await secretApi.create(namespace, body);
      return createResponse(secret);
    }
  );

  server.put(
    `${baseApiPath}/namespace/:namespace/dockerconfig`,
    getSchema({ tags, params: namespacedDockerConfigSchema, body: dockerConfigSchema }),
    async function (request: FastifyRequest) {
      const { namespace } = request.params as restParams.INamespacedParam;
      const { dockerconfig, resourceVersion } = request.body as restParams.ISecreteParams;
      const { secretApi } = await getDevWorkspaceClient(request);
      let secret: V1Secret | undefined;
      try {
         secret = await secretApi.read(namespace, secretName);
      } catch (e) {
         if ((e as { statusCode?: number } | undefined)?.statusCode === 404) {
           const body = createDockerConfigSecret(dockerconfig);
           const resp = await secretApi.create(namespace, body);
           return createResponse(resp);
         }
        throw e;
      }
      updateDockerConfigSecret(secret, dockerconfig, resourceVersion);
      const resp = await secretApi.replace(namespace, secretName, secret);
      return createResponse(resp);
    }
  );

  server.get(
    `${baseApiPath}/namespace/:namespace/dockerconfig`,
    getSchema({ tags, params: namespacedDockerConfigSchema }),
    async function (request: FastifyRequest) {
      const { namespace } = request.params as restParams.INamespacedParam;
      const { secretApi } = await getDevWorkspaceClient(request);
      let secret: V1Secret | undefined;
      try {
        secret = await secretApi.read(namespace, secretName);
      } catch (e) {
        if ((e as { statusCode?: number } | undefined)?.statusCode === 404) {
          return createResponse(secret);
        }
        throw e;
      }
      return createResponse(secret);
    }
  );

  server.delete(
    `${baseApiPath}/namespace/:namespace/dockerconfig`,
    getSchema({ tags, params: namespacedDockerConfigSchema }),
    async function (request: FastifyRequest, reply: FastifyReply) {
      const { namespace } = request.params as restParams.INamespacedParam;
      const { secretApi } = await getDevWorkspaceClient(request);
      const { status, message } = await secretApi.delete(namespace, secretName);
      if (status === 'Failure') {
        throw new Error(message);
      }
      reply.code(204);
      return reply.send();
    }
  );
}

function createDockerConfigSecret(dockerconfig: string): V1Secret {
  return {
    apiVersion: 'v1',
    data: {
      '.dockerconfigjson': dockerconfig
    },
    kind: 'Secret',
    metadata: {
      name: secretName,
      labels: secretLabels,
    },
    type: 'kubernetes.io/dockerconfigjson'
  };
}

function getDockerConfig(secret?: V1Secret): string {
  return secret?.data?.['.dockerconfigjson'] || '';
}

function createResponse(secret?: V1Secret): api.IDockerConfig {
  return {
    dockerconfig: getDockerConfig(secret),
    resourceVersion: secret?.metadata?.resourceVersion,
  };
}

function updateDockerConfigSecret(secret: V1Secret, dockerconfig: string, resourceVersion?: string) {
  secret.data =  { '.dockerconfigjson': dockerconfig };
  if (!secret.metadata) {
    return;
  }
  secret.metadata.labels = secretLabels;
  if (resourceVersion) {
    secret.metadata.resourceVersion = resourceVersion;
  }
}
