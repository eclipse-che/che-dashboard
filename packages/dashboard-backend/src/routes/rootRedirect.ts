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

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fs from 'fs';
import path from 'path';

export function serializeForScript(value: unknown): string {
  return (JSON.stringify(value ?? null) ?? 'null')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function registerRootRedirect(publicFolder: string, server: FastifyInstance): void {
  const rootPath = path.resolve(__dirname, publicFolder);
  const rootIndexPath = path.join(rootPath, 'index.html');

  const handler = async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('cache-control', 'no-store, max-age=0');

    const redirectUrl = process.env.CHE_DASHBOARD_REDIRECT_URL?.trim();
    let html: string;
    try {
      html = await fs.promises.readFile(rootIndexPath, 'utf-8');
      if (redirectUrl) {
        const script = `<script>window.CHE_DASHBOARD_REDIRECT_URL = ${serializeForScript(redirectUrl)};</script>`;
        const headRegex = /<head[^>]*>/i;
        html = headRegex.test(html)
          ? html.replace(headRegex, match => `${match}${script}`)
          : `${script}${html}`;
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return reply.callNotFound();
      }
      throw error;
    }

    return reply.type('text/html; charset=utf-8').send(html);
  };

  server.get('/', handler);
  server.get('/index.html', handler);
}
