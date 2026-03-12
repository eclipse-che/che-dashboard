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

import { registerCheApiProxy } from '@/localRun/proxies/cheServerApi';

jest.mock('@fastify/http-proxy', () => jest.fn());
jest.mock('@/localRun/hooks/stubCheServerOptionsRequests', () => ({
  stubCheServerOptionsRequests: jest.fn(),
}));
jest.mock('@/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

describe('registerCheApiProxy', () => {
  let mockServer: { register: jest.Mock };

  beforeEach(() => {
    mockServer = { register: jest.fn() };
  });

  test('should register proxy for /api/', () => {
    registerCheApiProxy(mockServer as any, 'https://che.example.com', 'https://che.example.com');

    const prefixes = mockServer.register.mock.calls.map(call => call[1]?.prefix);
    expect(prefixes).toContain('/api/');
  });

  test('should register proxy for /dashboard/devfile-registry/', () => {
    registerCheApiProxy(mockServer as any, 'https://che.example.com', 'https://che.example.com');

    const prefixes = mockServer.register.mock.calls.map(call => call[1]?.prefix);
    expect(prefixes).toContain('/dashboard/devfile-registry/');
  });

  test('should forward devfile registry to the same upstream', () => {
    const upstream = 'https://che.example.com';
    registerCheApiProxy(mockServer as any, upstream, 'https://che.example.com');

    const devfileRegistryCall = mockServer.register.mock.calls.find(
      call => call[1]?.prefix === '/dashboard/devfile-registry/',
    );
    expect(devfileRegistryCall).toBeDefined();
    expect(devfileRegistryCall![1].upstream).toBe(upstream);
    expect(devfileRegistryCall![1].rewritePrefix).toBe('/dashboard/devfile-registry/');
  });
});
