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

import { api } from '@eclipse-che/common';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { baseApiPath } from '@/constants/config';
import {
  devWorkspacePatchSchema,
  devworkspaceSchema,
  namespacedSchema,
  namespacedWorkspaceSchema,
} from '@/constants/schemas';
import { restParams } from '@/models';
import { getDevWorkspaceClient, getKubeConfig } from '@/routes/api/helpers/getDevWorkspaceClient';
import { getToken } from '@/routes/api/helpers/getToken';
import { getSchema } from '@/services/helpers';
import { PostStartInjector } from '@/services/PostStartInjector';

const tags = ['Devworkspace'];

const WORKSPACE_TYPE_LABEL = 'che.eclipse.org/workspace-type';

function isAgentWorkspace(labels: Record<string, string> | undefined): boolean {
  return labels?.[WORKSPACE_TYPE_LABEL] === 'agent';
}

export function registerDevworkspacesRoutes(instance: FastifyInstance) {
  instance.register(async server => {
    server.get(
      `${baseApiPath}/namespace/:namespace/devworkspaces`,
      getSchema({ tags, params: namespacedSchema }),
      async function (request: FastifyRequest) {
        const { namespace } = request.params as restParams.INamespacedParams;
        const token = getToken(request);
        const { devworkspaceApi } = getDevWorkspaceClient(token);
        return await devworkspaceApi.listInNamespace(namespace);
      },
    );

    server.post(
      `${baseApiPath}/namespace/:namespace/devworkspaces`,
      getSchema({ tags, params: namespacedSchema, body: devworkspaceSchema }),
      async function (request: FastifyRequest, reply: FastifyReply) {
        const { devworkspace } = request.body as restParams.IDevWorkspaceSpecParams;
        const { namespace } = request.params as restParams.INamespacedParams;
        if (!devworkspace.metadata) {
          devworkspace.metadata = {};
        }
        if (!devworkspace.metadata.annotations) {
          devworkspace.metadata.annotations = {};
        }
        devworkspace.metadata.namespace = namespace;

        const token = getToken(request);
        const dwClient = getDevWorkspaceClient(token);

        const { headers, devWorkspace } = await dwClient.devworkspaceApi.create(
          devworkspace,
          namespace,
        );

        // Trigger server-side injection when workspace is created in started mode
        // (e.g. factory URL flow). Without this the watch would only be set up on
        // PATCH /spec/started=true (restart), missing first-time creation.
        // Skip for agent workspaces — they don't need kubeconfig/podman injection.
        const workspaceName = devWorkspace.metadata?.name;
        if (
          devworkspace.spec?.started === true &&
          workspaceName &&
          !isAgentWorkspace(devworkspace.metadata?.labels)
        ) {
          const kc = getKubeConfig(token);
          PostStartInjector.watchAndInject(
            kc,
            namespace,
            workspaceName,
            dwClient.kubeConfigApi,
            dwClient.podmanApi,
          );
        }

        reply.headers(headers).send(devWorkspace);
      },
    );

    server.get(
      `${baseApiPath}/namespace/:namespace/devworkspaces/:workspaceName`,
      getSchema({ tags, params: namespacedWorkspaceSchema }),
      async function (request: FastifyRequest) {
        const { namespace, workspaceName } =
          request.params as restParams.INamespacedWorkspaceParams;
        const token = getToken(request);
        const { devworkspaceApi } = getDevWorkspaceClient(token);
        return devworkspaceApi.getByName(namespace, workspaceName);
      },
    );

    server.patch(
      `${baseApiPath}/namespace/:namespace/devworkspaces/:workspaceName`,
      getSchema({ tags, params: namespacedWorkspaceSchema, body: devWorkspacePatchSchema }),
      async function (request: FastifyRequest, reply: FastifyReply) {
        const { namespace, workspaceName } =
          request.params as restParams.INamespacedWorkspaceParams;
        const patch = request.body as api.IPatch[];
        const token = getToken(request);
        const dwClient = getDevWorkspaceClient(token);
        const { headers, devWorkspace } = await dwClient.devworkspaceApi.patch(
          namespace,
          workspaceName,
          patch,
        );

        const isStarting = patch.some(p => p.path === '/spec/started' && p.value === true);
        if (isStarting && !isAgentWorkspace(devWorkspace.metadata?.labels)) {
          const kc = getKubeConfig(token);
          PostStartInjector.watchAndInject(
            kc,
            namespace,
            workspaceName,
            dwClient.kubeConfigApi,
            dwClient.podmanApi,
          );
        }

        reply.headers(headers).send(devWorkspace);
      },
    );

    server.delete(
      `${baseApiPath}/namespace/:namespace/devworkspaces/:workspaceName`,
      getSchema({
        tags,
        params: namespacedWorkspaceSchema,
        response: {
          204: {
            description: 'The DevWorkspace is successfully marked for deletion',
            type: 'null',
          },
        },
      }),
      async function (request: FastifyRequest, reply: FastifyReply) {
        const { namespace, workspaceName } =
          request.params as restParams.INamespacedWorkspaceParams;
        const token = getToken(request);
        const { devworkspaceApi } = getDevWorkspaceClient(token);

        await devworkspaceApi.delete(namespace, workspaceName);

        reply.code(204).send();
      },
    );
  });
}
