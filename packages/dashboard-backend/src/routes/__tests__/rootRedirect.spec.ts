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

import fastify, { FastifyInstance } from 'fastify';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { registerStaticServer } from '@/plugins/staticServer';
import { registerFactoryAcceptanceRedirect } from '@/routes/factoryAcceptanceRedirect';
import { registerRootRedirect, serializeForScript } from '@/routes/rootRedirect';
import { setup, teardown } from '@/utils/appBuilder';

jest.mock('@/routes/api/helpers/getDevWorkspaceClient.ts');
jest.mock('@/routes/api/helpers/getServiceAccountToken.ts');

describe('serializeForScript', () => {
  it('should escape angle brackets, ampersands, and unicode separators', () => {
    const serialized = serializeForScript(
      'https://example.com/<script>alert("xss")&foo\u2028\u2029</script>',
    );
    expect(serialized).not.toContain('<');
    expect(serialized).not.toContain('>');
    expect(serialized).not.toContain('&');
    expect(serialized).not.toContain('\u2028');
    expect(serialized).not.toContain('\u2029');
    expect(serialized).toContain('\\u003c');
    expect(serialized).toContain('\\u003e');
    expect(serialized).toContain('\\u0026');
    expect(serialized).toContain('\\u2028');
    expect(serialized).toContain('\\u2029');
  });

  it('should safely serialize undefined or null without throwing', () => {
    expect(serializeForScript(undefined)).toEqual('null');
    expect(serializeForScript(null)).toEqual('null');
  });
});

describe('Root Redirect', () => {
  let app: FastifyInstance;
  const indexHtml =
    '<!doctype html><html><head><title>Che</title></head><body><script src="/dashboard/static/preload/accept-factory-link.js"></script></body></html>';

  beforeEach(() => {
    jest.spyOn(fs.promises, 'readFile').mockResolvedValue(indexHtml);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.CHE_DASHBOARD_REDIRECT_URL;
    if (app) {
      teardown(app);
    }
  });

  it('should serve index.html without injected script when CHE_DASHBOARD_REDIRECT_URL is unset', async () => {
    delete process.env.CHE_DASHBOARD_REDIRECT_URL;
    app = await setup();

    const res = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(res.statusCode).toEqual(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.headers['cache-control']).toEqual('no-store, max-age=0');
    expect(res.payload).not.toContain('window.CHE_DASHBOARD_REDIRECT_URL');
    expect(res.payload).toBe(indexHtml);
  });

  test.each(['/', '/index.html'])(
    'should inject window.CHE_DASHBOARD_REDIRECT_URL for %s when configured',
    async url => {
      const redirectUrl = 'https://alternative-dashboard.example.com';
      process.env.CHE_DASHBOARD_REDIRECT_URL = redirectUrl;
      app = await setup({
        env: {
          CHE_DASHBOARD_REDIRECT_URL: redirectUrl,
        },
      });

      const res = await app.inject({
        method: 'GET',
        url,
      });

      expect(res.statusCode).toEqual(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.payload).toContain(
        `<script>window.CHE_DASHBOARD_REDIRECT_URL = ${JSON.stringify(redirectUrl)};</script>`,
      );
    },
  );

  it('should not inject script when CHE_DASHBOARD_REDIRECT_URL is whitespace', async () => {
    process.env.CHE_DASHBOARD_REDIRECT_URL = '   ';
    app = await setup({
      env: {
        CHE_DASHBOARD_REDIRECT_URL: '   ',
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(res.statusCode).toEqual(200);
    expect(res.payload).not.toContain('window.CHE_DASHBOARD_REDIRECT_URL');
  });

  it('should safely serialize hostile values to prevent script breakout and HTML injection', async () => {
    const hostileUrl = 'https://example.com/</script><script>alert(1)</script>';
    process.env.CHE_DASHBOARD_REDIRECT_URL = hostileUrl;
    app = await setup({
      env: {
        CHE_DASHBOARD_REDIRECT_URL: hostileUrl,
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(res.statusCode).toEqual(200);
    // Must NOT contain unescaped closing script tag
    expect(res.payload).not.toContain('</script><script>alert(1)</script>');
    // Must contain escaped unicode sequence
    expect(res.payload).toContain(
      '\\u003c/script\\u003e\\u003cscript\\u003ealert(1)\\u003c/script\\u003e',
    );
  });

  it('should safely escape quote breakouts and HTML characters', async () => {
    const hostileUrl = 'https://example.com/?x="</script><>&`\'';
    process.env.CHE_DASHBOARD_REDIRECT_URL = hostileUrl;
    app = await setup({
      env: {
        CHE_DASHBOARD_REDIRECT_URL: hostileUrl,
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(res.statusCode).toEqual(200);
    // Only the injected configuration and original preload script may be present.
    expect(res.payload.match(/<\/script>/g)?.length).toEqual(2);
    expect(res.payload).toContain('\\"\\u003c/script\\u003e\\u003c\\u003e\\u0026');
  });

  it('should preserve dollar sign patterns in URL without corrupting html replacement', async () => {
    const dollarUrl = 'https://example.com/?price=$100&item=$&&other=$$';
    process.env.CHE_DASHBOARD_REDIRECT_URL = dollarUrl;
    app = await setup({
      env: {
        CHE_DASHBOARD_REDIRECT_URL: dollarUrl,
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(res.statusCode).toEqual(200);
    // Ensure $& is NOT replaced by <head>
    expect(res.payload).not.toContain('<head><head>');
    expect(res.payload).toContain('price=$100\\u0026item=$\\u0026\\u0026other=$$');
  });

  it('does not hide missing or unreadable index HTML behind a blank successful response', async () => {
    app = await setup();
    jest
      .mocked(fs.promises.readFile)
      .mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'ENOENT' }));
    expect((await app.inject('/')).statusCode).toBe(404);
    jest.mocked(fs.promises.readFile).mockRejectedValueOnce(new Error('unreadable'));
    expect((await app.inject('/index.html')).statusCode).toBe(500);
  });
});

describe('Root HTML and static route integration', () => {
  it('preserves real HTML, preload assets, dashboard HTML, and factory routes', async () => {
    const folder = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'che-root-'));
    const app = fastify();
    const html = '<html><head></head><body><script src="/preload.js"></script></body></html>';
    const originalEnv = process.env.CHE_DASHBOARD_REDIRECT_URL;
    try {
      await fs.promises.writeFile(path.join(folder, 'index.html'), html);
      await fs.promises.writeFile(path.join(folder, 'preload.js'), 'window.preloadLoaded = true;');
      await fs.promises.mkdir(path.join(folder, 'dashboard'));
      await fs.promises.writeFile(
        path.join(folder, 'dashboard/index.html'),
        '<html>Dashboard</html>',
      );
      process.env.CHE_DASHBOARD_REDIRECT_URL = 'https://alternative.example.com/';
      registerStaticServer(folder, app);
      registerRootRedirect(folder, app);
      registerFactoryAcceptanceRedirect(app);
      for (const route of ['/', '/index.html', '/?remotes=repo']) {
        const response = await app.inject(route);
        expect(response.statusCode).toBe(200);
        expect(
          response.payload.replace(/<script>window.CHE_DASHBOARD_REDIRECT_URL.*?<\/script>/, ''),
        ).toBe(html);
        expect(response.payload.indexOf('window.CHE_DASHBOARD_REDIRECT_URL')).toBeLessThan(
          response.payload.indexOf('src="/preload.js"'),
        );
        expect(response.headers['cache-control']).toBe('no-store, max-age=0');
      }
      const asset = await app.inject('/preload.js');
      expect(asset.payload).toBe('window.preloadLoaded = true;');
      expect(asset.headers['cache-control']).toContain('max-age=86400');
      expect((await app.inject('/dashboard/')).payload).toBe('<html>Dashboard</html>');
      expect((await app.inject('/missing')).statusCode).toBe(404);
      for (const route of ['/f', '/dashboard/f']) {
        const response = await app.inject(route + '?url=https://github.com/example/repo');
        expect(response.statusCode).toBe(302);
        expect(response.headers.location).toBe(
          '/dashboard/#/load-factory?url=https%3A%2F%2Fgithub.com%2Fexample%2Frepo',
        );
      }
    } finally {
      await app.close();
      await fs.promises.rm(folder, { recursive: true, force: true });
      if (originalEnv === undefined) delete process.env.CHE_DASHBOARD_REDIRECT_URL;
      else process.env.CHE_DASHBOARD_REDIRECT_URL = originalEnv;
    }
  });
});
