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

import { applyUrlOverrides, DEFAULT_CONFIG, loadConfig, normalizeConfig } from '@/services/config';

describe('normalizeConfig', () => {
  it('falls back to the defaults for a non-object', () => {
    expect(normalizeConfig(null)).toEqual(DEFAULT_CONFIG);
    expect(normalizeConfig('nope')).toEqual(DEFAULT_CONFIG);
  });

  it('keeps the known fields', () => {
    const config = normalizeConfig({
      mode: 'cluster',
      kubeApiBaseUrl: 'https://api.example.com',
      namespace: 'user-ns',
      samplesIndexUrl: './samples/index.json',
      dashboardUrl: '/dashboard/#/workspaces',
    });

    expect(config).toEqual({
      mode: 'cluster',
      kubeApiBaseUrl: 'https://api.example.com',
      namespace: 'user-ns',
      samplesIndexUrl: './samples/index.json',
      dashboardUrl: '/dashboard/#/workspaces',
    });
  });

  it('strips a trailing slash from the API base URL so paths do not double up', () => {
    expect(normalizeConfig({ kubeApiBaseUrl: 'https://api.example.com/' }).kubeApiBaseUrl).toBe(
      'https://api.example.com',
    );
  });

  it('ignores an unknown mode', () => {
    expect(normalizeConfig({ mode: 'offline' }).mode).toBe(DEFAULT_CONFIG.mode);
  });
});

describe('applyUrlOverrides', () => {
  it('lets the query string switch to mock mode', () => {
    expect(applyUrlOverrides(DEFAULT_CONFIG, '?mode=mock').mode).toBe('mock');
  });

  it('lets the query string pick the namespace', () => {
    expect(applyUrlOverrides(DEFAULT_CONFIG, '?namespace=other-ns').namespace).toBe('other-ns');
  });

  it('ignores an unknown mode', () => {
    expect(applyUrlOverrides({ ...DEFAULT_CONFIG, mode: 'cluster' }, '?mode=bogus').mode).toBe(
      'cluster',
    );
  });

  it('keeps the configured values when nothing is overridden', () => {
    expect(applyUrlOverrides(DEFAULT_CONFIG, '')).toEqual(DEFAULT_CONFIG);
  });
});

describe('loadConfig', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('reads and normalizes config.json', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ mode: 'mock', namespace: 'from-file' }),
    });

    const config = await loadConfig();

    expect(config.mode).toBe('mock');
    expect(config.namespace).toBe('from-file');
  });

  it('falls back to the defaults when config.json is missing', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

    expect(await loadConfig()).toEqual(DEFAULT_CONFIG);
  });

  it('falls back to the defaults when the request throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));

    expect(await loadConfig()).toEqual(DEFAULT_CONFIG);
  });
});
