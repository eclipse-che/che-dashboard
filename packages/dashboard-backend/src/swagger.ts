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
import fastifySwagger from 'fastify-swagger';
import { FastifyInstance } from 'fastify';

const routePrefix = 'dashboard/api/swagger';

export function startSwagger(server: FastifyInstance) {
  console.log(`Che Dashboard swagger is running on "${routePrefix}".`);

  server.register(fastifySwagger, { routePrefix,
    swagger: {
      info: {
        title: 'CHE Dashboard swagger',
        description: 'testing dashboard-backend api',
        version: '0.0.1'
      },
      consumes: ['application/json'],
      produces: ['application/json'],
    },
    hideUntagged: true,
    exposeRoute: true
  });

}
