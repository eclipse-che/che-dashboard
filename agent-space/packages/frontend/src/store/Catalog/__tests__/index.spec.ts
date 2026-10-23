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

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import {
  catalogActionCreators,
  selectAiProviders,
  selectAiTools,
  selectCatalogError,
  selectCatalogIsLoaded,
  selectCatalogIsLoading,
} from '@/store/Catalog';
import { unloadedState } from '@/store/Catalog/reducer';
import { createTestStore } from '@/testUtils';

const AI_REGISTRY = {
  providers: [{ id: 'anthropic', name: 'Anthropic' }],
  tools: [{ providerId: 'anthropic', name: 'Claude Code', injectorImage: 'image' }],
};

/** Serves the dashboard endpoints the catalogue is assembled from. */
function stubDashboardApi(replies: Record<string, unknown>): jest.SpyInstance {
  const http = axios.create({
    adapter: async (config: InternalAxiosRequestConfig) => {
      const data = replies[String(config.url)];
      const response: AxiosResponse = { status: 200, statusText: '', data, headers: {}, config };
      if (data === undefined) {
        throw new AxiosError('not served', '404', config, {}, { ...response, status: 404 });
      }
      return response;
    },
  });

  return jest.spyOn(axios, 'create').mockReturnValue(http);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('requestCatalog', () => {
  it('stores what the dashboard publishes', async () => {
    stubDashboardApi({
      '/dashboard/api/ai-registry': AI_REGISTRY,
      '/dashboard/api/cluster-config': { currentArchitecture: 'amd64' },
    });
    const store = createTestStore();

    await store.dispatch(catalogActionCreators.requestCatalog());
    const state = store.getState();

    expect(selectAiTools(state)).toHaveLength(1);
    expect(selectAiProviders(state)).toHaveLength(1);
    expect(selectCatalogIsLoading(state)).toBe(false);
    expect(selectCatalogIsLoaded(state)).toBe(true);
    expect(selectCatalogError(state)).toBeUndefined();
  });

  it('settles on an empty catalogue when the cluster publishes no AI registry', async () => {
    stubDashboardApi({});
    const store = createTestStore();

    await store.dispatch(catalogActionCreators.requestCatalog());
    const state = store.getState();

    // Loaded with nothing in it is a different answer from "still loading":
    // the create page hides the selector on the first and waits on the second.
    expect(selectAiTools(state)).toEqual([]);
    expect(selectCatalogIsLoaded(state)).toBe(true);
    expect(selectCatalogError(state)).toBeUndefined();
  });

  it('reports a request layer that broke outright', async () => {
    jest.spyOn(axios, 'create').mockImplementation(() => {
      throw new Error('no network stack');
    });
    const store = createTestStore();

    await store.dispatch(catalogActionCreators.requestCatalog());
    const state = store.getState();

    expect(selectCatalogError(state)?.message).toContain('no network stack');
    expect(selectCatalogIsLoading(state)).toBe(false);
    expect(selectAiTools(state)).toEqual([]);
  });

  it('claims the spinner only while nothing has been shown yet', async () => {
    stubDashboardApi({ '/dashboard/api/ai-registry': AI_REGISTRY });
    const store = createTestStore();

    const first = store.dispatch(catalogActionCreators.requestCatalog());
    expect(selectCatalogIsLoading(store.getState())).toBe(true);
    await first;

    const second = store.dispatch(catalogActionCreators.requestCatalog());
    expect(selectCatalogIsLoading(store.getState())).toBe(false);
    await second;
  });

  it('clears an earlier error once the catalogue loads', async () => {
    stubDashboardApi({ '/dashboard/api/ai-registry': AI_REGISTRY });
    const store = createTestStore({
      preloadedState: {
        catalog: {
          ...unloadedState,
          isLoaded: true,
          error: { message: 'Earlier failure.', statusCode: 500 },
        },
      },
    });

    await store.dispatch(catalogActionCreators.requestCatalog());

    expect(selectCatalogError(store.getState())).toBeUndefined();
  });
});
