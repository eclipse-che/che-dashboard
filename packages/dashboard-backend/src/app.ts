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
import args from 'args';
import fastify, { FastifyInstance } from 'fastify';
import 'reflect-metadata';
import { isLocalRun, registerLocalServers } from './localRun';
import {
  addAuthorizationHooks,
  addDexProxy,
  registerDexCallback,
  registerOauth,
} from './localRun/dexHelper';
import { registerCors } from './plugins/cors';
import { registerStaticServer } from './plugins/staticServer';
import { registerSwagger } from './plugins/swagger';
import { registerWebSocket } from './plugins/webSocket';
import { registerClusterConfigApi } from './routes/api/clusterConfigApi';
import { registerClusterInfoApi } from './routes/api/clusterInfoApi';
import { registerDevworkspaceApi } from './routes/api/devworkspaceApi';
import { registerTemplateApi } from './routes/api/devworkspaceTemplateApi';
import { registerDevworkspaceWebsocketWatcher } from './routes/api/devworkspaceWebsocketWatcher';
import { registerDockerConfigApi } from './routes/api/dockerConfigApi';
import { registerKubeConfigApi } from './routes/api/kubeConfigApi';
import { namespaceApi } from './routes/api/namespaceApi';
import { registerServerConfigApi } from './routes/api/serverConfigApi';
import { registerYamlResolverApi } from './routes/api/yamlResolverApi';
import { registerFactoryAcceptance } from './routes/factoryAcceptance';

export default function buildApp(): FastifyInstance {
  const CHE_HOST = process.env.CHE_HOST as string;

  if (!CHE_HOST) {
    console.error('CHE_HOST environment variable is required');
    process.exit(1);
  }

  args.option('publicFolder', 'The public folder to serve', './public');

  const { publicFolder } = args.parse(process.argv) as { publicFolder: string };

  const server = fastify({
    logger: false,
  });

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
    const DEX_INGRESS = process.env.DEX_INGRESS as string;
    if (DEX_INGRESS) {
      addDexProxy(server, `https://${DEX_INGRESS}`);
      registerDexCallback(server);
      registerOauth(server);
      addAuthorizationHooks(server);
    }
    const CHE_HOST_ORIGIN = process.env.CHE_HOST_ORIGIN as string;
    registerLocalServers(server, CHE_HOST_ORIGIN);
  }

  registerCors(isLocalRun, server);

  registerStaticServer(publicFolder, server);

  registerFactoryAcceptance(server);

  registerDevworkspaceWebsocketWatcher(server);

  // swagger and API
  registerSwagger(server);

  if (isLocalRun) {
    namespaceApi(server);
  }

  registerDevworkspaceApi(server);

  registerTemplateApi(server);

  registerDockerConfigApi(server);

  registerServerConfigApi(server);

  registerKubeConfigApi(server);

  registerClusterInfoApi(server);

  registerClusterConfigApi(server);

  registerYamlResolverApi(server);

  return server;
}
