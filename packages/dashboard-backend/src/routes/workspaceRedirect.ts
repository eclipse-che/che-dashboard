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

export function registerWorkspaceRedirect(server: FastifyInstance): void {
  // redirect to the Dashboard factory flow
  function redirectWorkspaceFlow(path: string) {
    server.get(path, async (request: FastifyRequest, reply: FastifyReply) => {
      const searchParams = new URLSearchParams(decodeURIComponent(request.url.replace(path, '')));
      const params = searchParams.get('params');
      if (params) {
        const parse: { namespace: string; workspace: string } = JSON.parse(params);
        return reply.redirect(`/dashboard/#/ide/${parse.namespace}/${parse.workspace}`);
      }
    });
  }
  redirectWorkspaceFlow('/w');
  redirectWorkspaceFlow('/dashboard/w');
}
