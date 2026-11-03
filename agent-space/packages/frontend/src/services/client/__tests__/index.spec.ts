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

import { createSandboxClient } from '@/services/client';
import { KubeSandboxClient } from '@/services/client/kubeClient';
import { AgentSpaceConfig, DEFAULT_CONFIG } from '@/services/config';

function config(overrides: Partial<AgentSpaceConfig> = {}): AgentSpaceConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

describe('createSandboxClient', () => {
  let isAvailable: jest.SpyInstance<Promise<boolean>, []>;

  beforeEach(() => {
    isAvailable = jest.spyOn(KubeSandboxClient.prototype, 'isAvailable');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the mock client when mock mode is configured', async () => {
    const client = await createSandboxClient(config({ mode: 'mock' }));

    expect(client.mode).toBe('mock');
    expect(isAvailable).not.toHaveBeenCalled();
  });

  it('seeds the mock client with the configured namespace', async () => {
    const client = await createSandboxClient(config({ mode: 'mock', namespace: 'user-ns' }));

    expect(await client.listNamespaces()).toEqual(['user-ns']);
  });

  it('uses the cluster client without probing when cluster mode is forced', async () => {
    const client = await createSandboxClient(config({ mode: 'cluster' }));

    expect(client.mode).toBe('cluster');
    expect(isAvailable).not.toHaveBeenCalled();
  });

  it('picks the cluster client in auto mode when the API group answers', async () => {
    isAvailable.mockResolvedValue(true);

    expect((await createSandboxClient(config({ mode: 'auto' }))).mode).toBe('cluster');
  });

  it('falls back to demo data in auto mode when the API group is unreachable', async () => {
    isAvailable.mockResolvedValue(false);

    expect((await createSandboxClient(config({ mode: 'auto' }))).mode).toBe('mock');
  });
});
