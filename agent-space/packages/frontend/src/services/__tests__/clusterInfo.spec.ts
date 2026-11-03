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

import {
  buildSandboxConsoleUrl,
  fetchClusterConsoleUrl,
  pickClusterConsoleUrl,
} from '@/services/clusterInfo';
import { Sandbox, SANDBOX_API_VERSION_FULL, SANDBOX_KIND } from '@/services/types';

const CONSOLE = 'https://console.example.com';

function sandbox(overrides: Partial<Sandbox> = {}): Sandbox {
  return {
    apiVersion: SANDBOX_API_VERSION_FULL,
    kind: SANDBOX_KIND,
    metadata: { name: 'my-agent', namespace: 'user-ns' },
    spec: { podTemplate: { spec: { containers: [] } } },
    ...overrides,
  };
}

describe('pickClusterConsoleUrl', () => {
  it('takes the console out of what the dashboard publishes', () => {
    const payload = {
      applications: [
        { id: 'something-else', url: 'https://nope.example.com' },
        { id: 'cluster-console', url: CONSOLE, title: 'OpenShift console' },
      ],
    };

    expect(pickClusterConsoleUrl(payload)).toBe(CONSOLE);
  });

  it('drops the trailing slash, which would double up in the path', () => {
    expect(
      pickClusterConsoleUrl({ applications: [{ id: 'cluster-console', url: `${CONSOLE}/` }] }),
    ).toBe(CONSOLE);
  });

  it.each([
    ['a cluster with no console', { applications: [] }],
    ['a payload that is not an object', 'no'],
    ['a payload with no applications', {}],
    ['applications that are not a list', { applications: 'all' }],
    ['a console entry with no url', { applications: [{ id: 'cluster-console' }] }],
  ])('reports none for %s', (_label, payload) => {
    expect(pickClusterConsoleUrl(payload)).toBe('');
  });
});

describe('fetchClusterConsoleUrl', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('asks the dashboard backend it is served next to', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ applications: [{ id: 'cluster-console', url: CONSOLE }] }),
    });
    global.fetch = mockFetch as unknown as typeof global.fetch;

    await expect(fetchClusterConsoleUrl()).resolves.toBe(CONSOLE);
    expect(mockFetch).toHaveBeenCalledWith('/dashboard/api/cluster-info', { cache: 'no-cache' });
  });

  it('asks the configured origin when the backend is elsewhere', async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ applications: [] }) });
    global.fetch = mockFetch as unknown as typeof global.fetch;

    await fetchClusterConsoleUrl('https://che.example.com');

    expect(mockFetch).toHaveBeenCalledWith('https://che.example.com/dashboard/api/cluster-info', {
      cache: 'no-cache',
    });
  });

  it('reports no console when the request is refused', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof global.fetch;

    await expect(fetchClusterConsoleUrl()).resolves.toBe('');
  });

  it('reports no console when there is no dashboard to ask', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof global.fetch;

    await expect(fetchClusterConsoleUrl()).resolves.toBe('');
  });
});

describe('buildSandboxConsoleUrl', () => {
  it('points at the sandbox the way the console addresses a resource', () => {
    expect(buildSandboxConsoleUrl(CONSOLE, sandbox())).toBe(
      `${CONSOLE}/k8s/ns/user-ns/agents.x-k8s.io~v1beta1~Sandbox/my-agent`,
    );
  });

  it('falls back to the API version this UI speaks', () => {
    const bare = sandbox();
    delete (bare as Partial<Sandbox>).apiVersion;
    delete (bare as Partial<Sandbox>).kind;

    expect(buildSandboxConsoleUrl(CONSOLE, bare)).toContain('agents.x-k8s.io~v1beta1~Sandbox');
  });

  it('links nothing on a cluster that publishes no console', () => {
    expect(buildSandboxConsoleUrl('', sandbox())).toBe('');
  });

  it('links nothing for a sandbox that is not in a namespace yet', () => {
    expect(buildSandboxConsoleUrl(CONSOLE, sandbox({ metadata: { name: 'my-agent' } }))).toBe('');
  });
});
