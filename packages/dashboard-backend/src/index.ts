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

import 'reflect-metadata';
import fastify, { RouteShorthandOptions } from 'fastify';
import {
  container,
  IDevWorkspaceClient,
  INVERSIFY_TYPES,
} from '@eclipse-che/devworkspace-client';
import {
  authenticationHeaderSchema,
  devfileStartedBody,
  namespacedSchema,
  namespacedWorkspaceSchema,
  templateStartedBody,
} from './constants/schemas';
import { authenticateOpenShift } from './services/openshift/kubeconfig';
import { initialize, initializeNodeConfig } from './nodeConfig';
import { routingClass } from './constants/config';
import SubscribeManager, { Subscriber } from './services/SubscribeManager';
import { NamespacedParam } from 'models';

// TODO add detection for openshift or kubernetes, we can probably just expose the devworkspace-client api to get that done for us
// TODO add service account for kubernetes with all the needed permissions
// TODO make it work on kubernetes

// Initialize the server and exit if any needed environment variables aren't found
initialize();

// Get the default node configuration based off the provided environment arguments
const devworkspaceClientConfig = initializeNodeConfig();
const client: IDevWorkspaceClient = container.get(
  INVERSIFY_TYPES.IDevWorkspaceClient
);

const server = fastify();

server.register(require('fastify-cors'), {
  origin: [process.env.CHE_HOST],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
});

server.addContentTypeParser(
  'application/merge-patch+json',
  { parseAs: 'string' },
  function(req, body, done) {
    try {
      var json = JSON.parse(body as string);
      done(null, json);
    } catch (err) {
      err.statusCode = 400;
      done(err, undefined);
    }
  }
);

server.register(require('fastify-websocket'), {
  handle: (conn: any) => conn.pipe(conn), // creates an echo server as a default
  errorHandler: (error: any, conn: any) => {
    console.log(error);
    conn.destroy(); // in the case with errors destroy(close) connection
  },
  options: { maxPayload: 1048576 }
});

server.get('/websocket', { websocket: true } as RouteShorthandOptions, connection => {
  const subscriber: Subscriber = connection.socket as any;
  const pubSubManager = new SubscribeManager(subscriber);
  connection.socket.on('message', message => {
    const { request, params, channel } = JSON.parse(message);
    if (!request || !channel) {
      return;
    }
    switch (request) {
      case 'UNSUBSCRIBE':
        pubSubManager.unsubscribe(channel);
        break;
      case 'SUBSCRIBE':
        pubSubManager.subscribe(channel, params as { token: string, namespace: string });
        break;
    }
  })
})

server.get(
  "/namespace/:namespace/devworkspaces",
  {
    schema: {
      headers: authenticationHeaderSchema,
      params: namespacedSchema,
    },
  },
  async (request) => {
    const token = request.headers.authentication as string;
    const { namespace } = request.params as models.NamespacedParam;
    const { devworkspaceApi } = await authenticateOpenShift(
      client.getNodeApi(devworkspaceClientConfig),
      token
    );
    return  devworkspaceApi.listInNamespace(namespace);
  }
);

server.post(
  '/template',
  {
    schema: {
      headers: authenticationHeaderSchema,
      body: templateStartedBody,
    },
  },
  async (request) => {
    const token = request.headers.authentication as string;
    const { template } = request.body as models.TemplateStartedBody;
    const { templateApi } = await authenticateOpenShift(
      client.getNodeApi(devworkspaceClientConfig),
      token
    );

    return templateApi.create(template);
  }
);

server.get(
  '/namespace/:namespace/init',
  {
    schema: {
      headers: authenticationHeaderSchema,
      params: namespacedSchema,
    },
  },
  async (request) => {
    const token = request.headers.authentication as string;
    const { namespace } = request.params as models.NamespacedWorkspaceParam;
    const { cheApi } = await authenticateOpenShift(
      client.getNodeApi(devworkspaceClientConfig),
      token
    );
    try {
      await cheApi.initializeNamespace(namespace);
    } catch (e) {
      return Promise.reject(`Was not able to initialize the namespace '${namespace}'`);
    }
    return Promise.resolve(true);
  }
);


server.post(
  '/namespace/:namespace/devworkspaces',
  {
    schema: {
      headers: authenticationHeaderSchema,
      body: devfileStartedBody,
    },
  },
  async (request) => {
    const token = request.headers.authentication as string;
    const { devfile, started } = request.body as models.DevfileStartedBody;
    const { devworkspaceApi } = await authenticateOpenShift(
      client.getNodeApi(devworkspaceClientConfig),
      token
    );
    // override the namespace from params
    const { namespace } = request.params as NamespacedParam;
    if (devfile.metadata === undefined) {
      devfile.metadata = {};
    }
    devfile.metadata.namespace = namespace

    const workspace = await devworkspaceApi.create(devfile, routingClass, started);
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
      const message = `Was not able to find a workspace with name '${devfile.metadata.name}' in namespace ${routingClass}`;
      return  Promise.reject(message);
    }
    return found;
  }
);

server.get(
  '/namespace/:namespace/devworkspaces/:workspaceName',
  {
    schema: {
      headers: authenticationHeaderSchema,
      params: namespacedWorkspaceSchema,
    },
  },
  async (request) => {
    const token = request.headers.authentication as string;
    const {
      namespace,
      workspaceName,
    } = request.params as models.NamespacedWorkspaceParam;
    const { devworkspaceApi } = await authenticateOpenShift(
      client.getNodeApi(devworkspaceClientConfig),
      token
    );
    return devworkspaceApi.getByName(namespace, workspaceName);
  }
);

server.delete(
  '/namespace/:namespace/devworkspaces/:workspaceName',
  {
    schema: {
      headers: authenticationHeaderSchema,
      params: namespacedWorkspaceSchema,
    },
  },
  async (request) => {
    const token = request.headers.authentication as string;
    const {
      namespace,
      workspaceName,
    } = request.params as models.NamespacedWorkspaceParam;
    const { devworkspaceApi } = await authenticateOpenShift(
      client.getNodeApi(devworkspaceClientConfig),
      token
    );
    return devworkspaceApi.delete(namespace, workspaceName);
  }
);

server.patch(
  '/namespace/:namespace/devworkspaces/:workspaceName',
  {
    schema: {
      headers: authenticationHeaderSchema,
      params: namespacedWorkspaceSchema,
    },
  },
  async (request) => {
    const token = request.headers.authentication as string;
    const {
      namespace,
      workspaceName,
    } = request.params as models.NamespacedWorkspaceParam;
    const patch = request.body as { op: string, path: string, value?: any; } [];
    const { devworkspaceApi } = await authenticateOpenShift(
      client.getNodeApi(devworkspaceClientConfig),
      token
    );
    return devworkspaceApi.patch(namespace, workspaceName, patch);
  }
);

server.listen(8080, '0.0.0.0', (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});

server.ready(() => {
  console.log(server.printRoutes());
});

async function delay(ms = 500): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
