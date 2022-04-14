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
import { isLocalRun } from './local-run';

export function registerPreload(server: FastifyInstance): void {
  // register entrypoint
  server.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    if (isLocalRun && !process.env.CLUSTER_ACCESS_TOKEN) {
      const authorizationEndpoint = server.localStart.generateAuthorizationUri(request);
      if (authorizationEndpoint) {
        return reply.redirect(authorizationEndpoint);
      }
    }
    return reply.redirect('/dashboard/static/preload/');
  });
}
