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

import { AgentSpaceConfig, DEFAULT_CONFIG } from '@/services/config';
import { FALLBACK_NAMESPACE, pickCheNamespace, resolveNamespace } from '@/services/namespace';
import { AgentSandboxClient } from '@/services/types';

function config(overrides: Partial<AgentSpaceConfig> = {}): AgentSpaceConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

function client(namespaces: string[]): {
  client: AgentSandboxClient;
  listNamespaces: jest.Mock<Promise<string[]>, []>;
} {
  const listNamespaces = jest.fn<Promise<string[]>, []>().mockResolvedValue(namespaces);
  return {
    client: {
      mode: 'mock',
      listSandboxes: jest.fn(),
      watchSandboxes: jest.fn(),
      getSandbox: jest.fn(),
      createSandbox: jest.fn(),
      deleteSandbox: jest.fn(),
      patchSandbox: jest.fn(),
      listEvents: jest.fn(),
      listNamespaces,
    },
    listNamespaces,
  };
}

describe('pickCheNamespace', () => {
  it('prefers the active namespace over the first one', () => {
    const payload = [
      { name: 'old-ns', attributes: { phase: 'TERMINATING' } },
      { name: 'user-ns', attributes: { phase: 'ACTIVE' } },
    ];

    expect(pickCheNamespace(payload)).toBe('user-ns');
  });

  it('falls back to the first entry when nothing is marked active', () => {
    expect(pickCheNamespace([{ name: 'user-ns' }, { name: 'other-ns' }])).toBe('user-ns');
  });

  it('skips entries without a name', () => {
    expect(pickCheNamespace([{ attributes: { phase: 'ACTIVE' } }, { name: 'user-ns' }])).toBe(
      'user-ns',
    );
  });

  it('returns nothing for an empty or unexpected payload', () => {
    expect(pickCheNamespace([])).toBeUndefined();
    expect(pickCheNamespace({})).toBeUndefined();
    expect(pickCheNamespace(undefined)).toBeUndefined();
  });
});

describe('resolveNamespace', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('uses the configured namespace without calling anything', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;
    const sandboxClient = client(['from-cluster']);

    expect(await resolveNamespace(config({ namespace: 'from-config' }), sandboxClient.client)).toBe(
      'from-config',
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sandboxClient.listNamespaces).not.toHaveBeenCalled();
  });

  it('falls back to the Che user namespace', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ name: 'che-user-ns', attributes: { phase: 'ACTIVE' } }],
    });

    expect(await resolveNamespace(config(), client(['from-cluster']).client)).toBe('che-user-ns');
  });

  it('falls back to the first namespace the cluster lists', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

    expect(await resolveNamespace(config(), client(['from-cluster']).client)).toBe('from-cluster');
  });

  it('falls back to the default namespace when nothing else is known', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('not served next to Che'));

    expect(await resolveNamespace(config(), client([]).client)).toBe(FALLBACK_NAMESPACE);
  });
});
