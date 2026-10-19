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
import { getSandboxClient, setSandboxClient } from '@/services/client/instance';
import { loadConfig } from '@/services/config';
import { resolveNamespace } from '@/services/namespace';
import { SandboxClientError } from '@/services/types';
import {
  bootstrapActionCreators,
  selectBootstrapError,
  selectBootstrapIsLoading,
  selectBootstrapIsReady,
  selectConfig,
  selectIsMockData,
  selectNamespace,
} from '@/store/Bootstrap';
import { createUnloadedStore, TEST_NAMESPACE, testClient, testConfig } from '@/testUtils';

jest.mock('@/services/config', () => ({
  ...jest.requireActual('@/services/config'),
  loadConfig: jest.fn(),
}));
jest.mock('@/services/client', () => ({ createSandboxClient: jest.fn() }));
jest.mock('@/services/namespace', () => ({ resolveNamespace: jest.fn() }));

const loadConfigMock = loadConfig as jest.MockedFunction<typeof loadConfig>;
const createClientMock = createSandboxClient as jest.MockedFunction<typeof createSandboxClient>;
const resolveNamespaceMock = resolveNamespace as jest.MockedFunction<typeof resolveNamespace>;

beforeEach(() => {
  jest.clearAllMocks();
  setSandboxClient(undefined);
});

describe('the Bootstrap slice', () => {
  it('starts out neither loading nor ready', () => {
    const state = createUnloadedStore().getState();

    expect(selectBootstrapIsLoading(state)).toBe(false);
    expect(selectBootstrapIsReady(state)).toBe(false);
    expect(selectBootstrapError(state)).toBeUndefined();
  });

  it('records the configuration, the namespace and the client mode', async () => {
    const config = testConfig({ namespace: TEST_NAMESPACE });
    loadConfigMock.mockResolvedValue(config);
    createClientMock.mockResolvedValue(testClient());
    resolveNamespaceMock.mockResolvedValue(TEST_NAMESPACE);
    const store = createUnloadedStore();

    await store.dispatch(bootstrapActionCreators.requestBootstrap());

    const state = store.getState();
    expect(selectBootstrapIsReady(state)).toBe(true);
    expect(selectConfig(state)).toEqual(config);
    expect(selectNamespace(state)).toBe(TEST_NAMESPACE);
    expect(selectIsMockData(state)).toBe(true);
  });

  it('installs the client outside the state, where the thunks look for it', async () => {
    const client = testClient();
    loadConfigMock.mockResolvedValue(testConfig());
    createClientMock.mockResolvedValue(client);
    resolveNamespaceMock.mockResolvedValue(TEST_NAMESPACE);
    const store = createUnloadedStore();

    await store.dispatch(bootstrapActionCreators.requestBootstrap());

    expect(getSandboxClient()).toBe(client);
  });

  it('resolves the namespace with the config and the client it just built', async () => {
    const config = testConfig();
    const client = testClient();
    loadConfigMock.mockResolvedValue(config);
    createClientMock.mockResolvedValue(client);
    resolveNamespaceMock.mockResolvedValue(TEST_NAMESPACE);

    await createUnloadedStore().dispatch(bootstrapActionCreators.requestBootstrap());

    expect(createClientMock).toHaveBeenCalledWith(config);
    expect(resolveNamespaceMock).toHaveBeenCalledWith(config, client);
  });

  it('keeps a failure in the state instead of rethrowing it', async () => {
    loadConfigMock.mockRejectedValue(new SandboxClientError(0, 'The cluster is unreachable.'));
    const store = createUnloadedStore();

    await expect(
      store.dispatch(bootstrapActionCreators.requestBootstrap()),
    ).resolves.toBeUndefined();

    const state = store.getState();
    expect(selectBootstrapIsReady(state)).toBe(false);
    expect(selectBootstrapError(state)).toEqual({
      message: 'The cluster is unreachable.',
      statusCode: 0,
      reason: undefined,
    });
  });

  it('uninstalls a half-built client so no page can use it', async () => {
    loadConfigMock.mockResolvedValue(testConfig());
    createClientMock.mockResolvedValue(testClient());
    resolveNamespaceMock.mockRejectedValue(new Error('no namespace'));

    await createUnloadedStore().dispatch(bootstrapActionCreators.requestBootstrap());

    expect(() => getSandboxClient()).toThrow();
  });

  it('clears the previous failure when the user retries', async () => {
    loadConfigMock.mockRejectedValueOnce(new Error('offline'));
    const store = createUnloadedStore();
    await store.dispatch(bootstrapActionCreators.requestBootstrap());
    expect(selectBootstrapError(store.getState())).toBeDefined();

    loadConfigMock.mockResolvedValue(testConfig());
    createClientMock.mockResolvedValue(testClient());
    resolveNamespaceMock.mockResolvedValue(TEST_NAMESPACE);
    await store.dispatch(bootstrapActionCreators.requestBootstrap());

    expect(selectBootstrapError(store.getState())).toBeUndefined();
    expect(selectBootstrapIsReady(store.getState())).toBe(true);
  });
});
