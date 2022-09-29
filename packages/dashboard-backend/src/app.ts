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

import { helpers } from '@eclipse-che/common';
import { FastifyInstance } from 'fastify';
import 'reflect-metadata';
import parseArgs from './helpers/parseArgs';
import { isLocalRun, registerLocalRun } from './localRun';
import { registerCors } from './plugins/cors';
import { registerStaticServer } from './plugins/staticServer';
import { registerSwagger } from './plugins/swagger';
import { registerWebSocket } from './plugins/webSocket';
import { registerClusterConfigRoute } from './routes/api/clusterConfig';
import { registerClusterInfoRoute } from './routes/api/clusterInfo';
import { registerDevworkspacesRoutes } from './routes/api/devworkspaces';
import { registerDevWorkspaceTemplates } from './routes/api/devworkspaceTemplates';
import { registerDevworkspaceWebsocketWatcher } from './routes/api/devworkspaceWebsocketWatcher';
import { registerDockerConfigApi } from './routes/api/dockerConfigApi';
import { registerKubeConfigApi } from './routes/api/kubeConfigApi';
import { namespaceApi } from './routes/api/namespaceApi';
import { registerServerConfigApi } from './routes/api/serverConfigApi';
import { registerYamlResolverApi } from './routes/api/yamlResolverApi';
import { registerFactoryAcceptanceRedirect } from './routes/factoryAcceptanceRedirect';

export default async function buildApp(server: FastifyInstance): Promise<void> {
  const cheHost = process.env.CHE_HOST as string;
  if (!cheHost) {
    console.error('CHE_HOST environment variable is required');
    process.exit(1);
  }

  const { publicFolder } = parseArgs();

  server.addContentTypeParser(
    'application/merge-patch+json',
    { parseAs: 'string' },
    function (req, body, done) {
      try {
        const json = JSON.parse(body as string);
        done(null, json);
      } catch (e) {
        const error = new Error(helpers.errors.getMessage(e));
        console.warn(`[WARN] Can't parse the JSON payload:`, body);
        done(error, undefined);
      }
    },
  );

  registerWebSocket(server);

  if (isLocalRun) {
    registerLocalRun(server);
  }

  registerCors(isLocalRun, server);

  registerStaticServer(publicFolder, server);

  registerFactoryAcceptanceRedirect(server);

  registerDevworkspaceWebsocketWatcher(server);

  // swagger and API
  registerSwagger(server);

  if (isLocalRun) {
    namespaceApi(server);
  }

  registerDevworkspacesRoutes(server);

  registerDevWorkspaceTemplates(server);

  registerDockerConfigApi(server);

  registerServerConfigApi(server);

  registerKubeConfigApi(server);

  registerClusterInfoRoute(server);

  registerClusterConfigRoute(server);

  registerYamlResolverApi(server);
}
