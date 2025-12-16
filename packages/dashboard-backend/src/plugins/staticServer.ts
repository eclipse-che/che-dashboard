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

import fastifyStatic from '@fastify/static';
import { DoneFuncWithErrOrRes, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fs from 'fs';
import path from 'path';

import { logger } from '@/utils/logger';

export function registerStaticServer(publicFolder: string, server: FastifyInstance) {
  const rootPath = path.resolve(__dirname, publicFolder);
  logger.info(`Static server's serving "${rootPath}" on 0.0.0.0:8080/`);

  server.register(fastifyStatic, {
    root: rootPath,
    maxAge: 24 * 60 * 60 * 1000,
    lastModified: true,
    prefix: '/',
    index: ['index.html'],
  });

  // SPA routing for v6 dashboard - serve index.html for any non-static routes
  server.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    const url = request.url;

    // Check if this is a v6 dashboard route (SPA routing)
    if (url.startsWith('/dashboard/v6/') || url === '/dashboard/v6') {
      const v6IndexPath = path.join(rootPath, 'dashboard', 'v6', 'index.html');
      if (fs.existsSync(v6IndexPath)) {
        reply.header('cache-control', 'no-store, max-age=0');
        return reply.sendFile('dashboard/v6/index.html');
      }
    }

    // Check if this is a main dashboard route (SPA routing)
    if (url.startsWith('/dashboard/') || url === '/dashboard') {
      const indexPath = path.join(rootPath, 'dashboard', 'index.html');
      if (fs.existsSync(indexPath)) {
        reply.header('cache-control', 'no-store, max-age=0');
        return reply.sendFile('dashboard/index.html');
      }
    }

    // Default 404 response
    reply
      .code(404)
      .send({ error: 'Not Found', message: `Route ${request.method}:${url} not found` });
  });

  const doNotCache = [
    '/dashboard/',
    '/dashboard/index.html',
    '/dashboard/service-worker.js',
    '/dashboard/assets/branding/product.json',
    '/dashboard/v6/',
    '/dashboard/v6/index.html',
    '/dashboard/v6/service-worker.js',
    '/dashboard/v6/assets/branding/product.json',
  ];
  server.addHook(
    'onSend',
    (request: FastifyRequest, reply: FastifyReply, payload: any, done: DoneFuncWithErrOrRes) => {
      const err = null;
      if (doNotCache.includes(request.url)) {
        reply.header('cache-control', 'no-store, max-age=0');
      }
      done(err, payload);
    },
  );
}
