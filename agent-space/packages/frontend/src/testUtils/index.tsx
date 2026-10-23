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

import { configureStore } from '@reduxjs/toolkit';
import { render, RenderResult } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

import { setSandboxClient } from '@/services/client/instance';
import { MockSandboxClient } from '@/services/client/mockClient';
import { AgentSpaceConfig, DEFAULT_CONFIG } from '@/services/config';
import { AgentSandboxClient } from '@/services/types';
import { RootState } from '@/store';
import { rootReducer } from '@/store/rootReducer';

export const TEST_NAMESPACE = 'user-ns';

export function testConfig(overrides: Partial<AgentSpaceConfig> = {}): AgentSpaceConfig {
  return { ...DEFAULT_CONFIG, mode: 'mock', namespace: TEST_NAMESPACE, ...overrides };
}

/** Mock client with the ready delay switched off so tests settle immediately. */
export function testClient(): MockSandboxClient {
  return new MockSandboxClient(TEST_NAMESPACE, 0);
}

export type StoreOptions = {
  client?: AgentSandboxClient;
  config?: AgentSpaceConfig;
  namespace?: string;
  /** Console the cluster publishes, empty by default as a plain cluster has none. */
  clusterConsoleUrl?: string;
  /** Slices to start from, merged over the bootstrapped defaults. */
  preloadedState?: Partial<RootState>;
};

export type TestStore = ReturnType<typeof createTestStore>;

/**
 * Store in the state the application has after a successful bootstrap, which
 * is the only state in which pages are ever mounted.
 *
 * Creating the store also installs the client, because the thunks reach it
 * through the module singleton rather than through the state.
 */
export function createTestStore({
  client,
  config,
  namespace,
  clusterConsoleUrl = '',
  preloadedState = {},
}: StoreOptions = {}) {
  const resolvedConfig = config ?? testConfig();
  const resolvedClient = client ?? testClient();

  setSandboxClient(resolvedClient);

  return configureStore({
    reducer: rootReducer,
    preloadedState: {
      bootstrap: {
        isLoading: false,
        isReady: true,
        config: resolvedConfig,
        namespace: namespace ?? resolvedConfig.namespace ?? TEST_NAMESPACE,
        clusterConsoleUrl,
        clientMode: resolvedClient.mode,
      },
      ...preloadedState,
    },
  });
}

/**
 * Store in its initial state, for the few tests that exercise the bootstrap
 * itself rather than a page that runs after it.
 */
export function createUnloadedStore() {
  return configureStore({ reducer: rootReducer });
}

export type RenderOptions = StoreOptions & {
  route?: string;
  store?: TestStore;
};

/**
 * Renders a page inside the store and the router, both of which every page in
 * this app assumes are present.
 */
export function renderInApp(
  ui: React.ReactElement,
  { route = '/', store, ...storeOptions }: RenderOptions = {},
): RenderResult & { store: TestStore } {
  const resolvedStore = store ?? createTestStore(storeOptions);

  return {
    ...render(
      <Provider store={resolvedStore}>
        <MemoryRouter
          initialEntries={[route]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          {ui}
        </MemoryRouter>
      </Provider>,
    ),
    store: resolvedStore,
  };
}

/** Wrapper for `renderHook`; hooks read the store but never the router. */
export function storeWrapper(options: StoreOptions = {}): React.FC<React.PropsWithChildren> {
  const store = createTestStore(options);

  function StoreWrapper(props: React.PropsWithChildren): React.ReactElement {
    return <Provider store={store}>{props.children}</Provider>;
  }

  return StoreWrapper;
}
