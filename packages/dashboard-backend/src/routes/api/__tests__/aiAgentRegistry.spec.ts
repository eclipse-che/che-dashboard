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

import { FastifyInstance } from 'fastify';

import { baseApiPath } from '@/constants/config';
import { setup, teardown } from '@/utils/appBuilder';

jest.mock('../helpers/getServiceAccountToken.ts');
jest.mock('../helpers/getDevWorkspaceClient.ts');

const mockListNamespacedConfigMap = jest.fn();

jest.mock('@/services/kubeclient/kubeConfigProvider', () => ({
  KubeConfigProvider: jest.fn().mockImplementation(() => ({
    getKubeConfig: jest.fn(() => ({
      makeApiClient: jest.fn(() => ({
        listNamespacedConfigMap: mockListNamespacedConfigMap,
      })),
    })),
  })),
}));

describe('AI Agent Registry Route', () => {
  let app: FastifyInstance;
  const originalEnv = process.env;
  let dateNowSpy: jest.SpyInstance;
  let currentTime: number;

  beforeAll(async () => {
    app = await setup({ env: { CHECLUSTER_CR_NAMESPACE: 'eclipse-che' } });
  });

  afterAll(() => {
    teardown(app);
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    currentTime = (currentTime || Date.now()) + 120_000;
    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(currentTime);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  test('should return empty registry when CHECLUSTER_CR_NAMESPACE is not set', async () => {
    delete process.env.CHECLUSTER_CR_NAMESPACE;

    const res = await app.inject({
      url: `${baseApiPath}/ai-agent-registry`,
      headers: { authorization: 'Bearer test-token' },
    });

    expect(res.statusCode).toEqual(200);
    expect(res.json()).toEqual({ agents: [], defaultAgentId: '' });

    process.env.CHECLUSTER_CR_NAMESPACE = 'eclipse-che';
  });

  test('should return empty registry when no ConfigMaps found', async () => {
    mockListNamespacedConfigMap.mockResolvedValue({ items: [] });

    const res = await app.inject({
      url: `${baseApiPath}/ai-agent-registry`,
      headers: { authorization: 'Bearer test-token' },
    });

    expect(res.statusCode).toEqual(200);
    expect(res.json()).toEqual({ agents: [], defaultAgentId: '' });
  });

  test('should return agents from registry ConfigMap', async () => {
    const registryData = {
      agents: [
        {
          id: 'test-agent',
          name: 'Test Agent',
          publisher: 'Test',
          description: 'A test agent',
          image: 'quay.io/test/agent',
          tag: 'v1',
          memoryLimit: '2Gi',
          cpuLimit: '1',
          terminalPort: 8080,
          env: [],
        },
      ],
      defaultAgentId: 'test-agent',
    };

    mockListNamespacedConfigMap.mockResolvedValue({
      items: [
        {
          data: {
            'registry.json': JSON.stringify(registryData),
          },
        },
      ],
    });

    const res = await app.inject({
      url: `${baseApiPath}/ai-agent-registry`,
      headers: { authorization: 'Bearer test-token' },
    });

    expect(res.statusCode).toEqual(200);
    const body = res.json();
    expect(body.agents).toHaveLength(1);
    expect(body.agents[0].id).toBe('test-agent');
    expect(body.defaultAgentId).toBe('test-agent');
  });

  test('should filter out invalid agents', async () => {
    const registryData = {
      agents: [
        {
          id: 'valid-agent',
          name: 'Valid',
          image: 'img',
          tag: 'v1',
          terminalPort: 8080,
        },
        {
          id: 'invalid-agent',
        },
        'not-an-object',
      ],
      defaultAgentId: 'valid-agent',
    };

    mockListNamespacedConfigMap.mockResolvedValue({
      items: [{ data: { 'registry.json': JSON.stringify(registryData) } }],
    });

    const res = await app.inject({
      url: `${baseApiPath}/ai-agent-registry`,
      headers: { authorization: 'Bearer test-token' },
    });

    expect(res.statusCode).toEqual(200);
    const body = res.json();
    expect(body.agents).toHaveLength(1);
    expect(body.agents[0].id).toBe('valid-agent');
  });

  test('should return empty registry when ConfigMap has no data', async () => {
    mockListNamespacedConfigMap.mockResolvedValue({
      items: [{ data: null }],
    });

    const res = await app.inject({
      url: `${baseApiPath}/ai-agent-registry`,
      headers: { authorization: 'Bearer test-token' },
    });

    expect(res.statusCode).toEqual(200);
    expect(res.json()).toEqual({ agents: [], defaultAgentId: '' });
  });

  test('should return empty registry when registry.json key is missing', async () => {
    mockListNamespacedConfigMap.mockResolvedValue({
      items: [{ data: { 'other-key': 'value' } }],
    });

    const res = await app.inject({
      url: `${baseApiPath}/ai-agent-registry`,
      headers: { authorization: 'Bearer test-token' },
    });

    expect(res.statusCode).toEqual(200);
    expect(res.json()).toEqual({ agents: [], defaultAgentId: '' });
  });

  test('should handle API errors gracefully', async () => {
    mockListNamespacedConfigMap.mockRejectedValue(new Error('API unavailable'));

    const res = await app.inject({
      url: `${baseApiPath}/ai-agent-registry`,
      headers: { authorization: 'Bearer test-token' },
    });

    expect(res.statusCode).toEqual(200);
    expect(res.json()).toEqual({ agents: [], defaultAgentId: '' });
  });
});
