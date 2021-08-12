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
import { baseApiPath, routingClass } from '../constants/config';
import { devfileStartedSchema, namespacedSchema, namespacedWorkspaceSchema } from '../constants/schemas';
import { getDevWorkspaceClient } from './helper';
import { restParams } from '../typings/models';
import { delay, getSchema } from '../services/helpers';

export function startDevworkspaceApi(server: FastifyInstance) {

  server.post(
    `${baseApiPath}/namespace/:namespace/devworkspaces`,
    getSchema({ body: devfileStartedSchema }),
    async (request: FastifyRequest) => {
      const { devfile, started } = request.body as restParams.IDevWorkspaceSpecParam;
      const { devworkspaceApi } = await getDevWorkspaceClient(request);
      // override the namespace from params
      const { namespace } = request.params as restParams.INamespacedParam;
      if (devfile.metadata === undefined) {
        devfile.metadata = {};
      }
      devfile.metadata.namespace = namespace;

      const workspace = await devworkspaceApi.create(devfile, routingClass, started);
      // todo refactor frontend in the way we rely in namespace/name instead of workspaceId, then we can skip waiting for status
      // we need to wait until the devworkspace has a status property
      let found;
      let count = 0;
      while (count < 5 && !found) {
        await delay();
        const potentialWorkspace = await devworkspaceApi.getByName(workspace.metadata.namespace, workspace.metadata.name);
        if (potentialWorkspace?.status) {
          found = potentialWorkspace;
        }
        count += 1;
      }
      if (!found) {
        const message = `Was not able to find a workspace with name '${devfile.metadata.name}' in namespace ${workspace.metadata.namespace}`;
        return  Promise.reject(message);
      }
      return found;
    }
  );

  server.patch(
    `${baseApiPath}/namespace/:namespace/devworkspaces/:workspaceName`,
    getSchema({ params: namespacedWorkspaceSchema }),
    async (request: FastifyRequest) => {
      const { namespace, workspaceName } = request.params as restParams.INamespacedWorkspaceParam;
      const patch = request.body as { op: string, path: string, value?: any; } [];
      const { devworkspaceApi } = await getDevWorkspaceClient(request);
      return devworkspaceApi.patch(namespace, workspaceName, patch);
    }
  );

  server.get(
    `${baseApiPath}/namespace/:namespace/devworkspaces`,
    getSchema({ params: namespacedSchema }),
    async (request: FastifyRequest) => {
      const { namespace } = request.params as restParams.INamespacedParam;
      const { devworkspaceApi } = await getDevWorkspaceClient(request);
      return devworkspaceApi.listInNamespace(namespace);
    }
  );

  server.get(
    `${baseApiPath}/namespace/:namespace/devworkspaces/:workspaceName`,
    getSchema({ params: namespacedSchema }),
    async (request: FastifyRequest) => {
      const { namespace, workspaceName } = request.params as restParams.INamespacedWorkspaceParam;
      const { devworkspaceApi } = await getDevWorkspaceClient(request);
      return devworkspaceApi.getByName(namespace, workspaceName);
    }
  );

  server.delete(
    `${baseApiPath}/namespace/:namespace/devworkspaces/:workspaceName`,
    getSchema({ params: namespacedWorkspaceSchema }),
    async (request: FastifyRequest) => {
      const { namespace, workspaceName } = request.params as restParams.INamespacedWorkspaceParam;
      const { devworkspaceApi } = await getDevWorkspaceClient(request);
      return devworkspaceApi.delete(namespace, workspaceName);
    }
  );
}
