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

/* eslint-disable @typescript-eslint/no-unused-vars */

import * as mockClient from '@kubernetes/client-node';

import {
  DEV_WORKSPACE_PREFERENCES_CONFIGMAP,
  SKIP_AUTHORIZATION_KEY,
  TRUSTED_SOURCES_KEY,
  WorkspacePreferencesApiService,
} from '@/devworkspaceClient/services/workspacePreferencesApi';

jest.mock('@/devworkspaceClient/services/helpers/retryableExec');

const namespace = 'user-che';

describe('Workspace Preferences API Service', () => {
  let workspacePreferencesApiService: WorkspacePreferencesApiService;

  const stubCoreV1Api = {
    readNamespacedConfigMap: () => {
      return Promise.resolve({} as mockClient.V1ConfigMap);
    },
    patchNamespacedConfigMap: () => {
      return Promise.resolve({} as mockClient.V1ConfigMap);
    },
  };

  const spyReadNamespacedConfigMap = jest.spyOn(stubCoreV1Api, 'readNamespacedConfigMap');
  const spyPatchNamespacedConfigMap = jest.spyOn(stubCoreV1Api, 'patchNamespacedConfigMap');

  beforeEach(() => {
    const { KubeConfig } = mockClient;
    const kubeConfig = new KubeConfig();
    kubeConfig.makeApiClient = jest.fn().mockImplementation(() => stubCoreV1Api);

    workspacePreferencesApiService = new WorkspacePreferencesApiService(kubeConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('get skip-authorisation workspace preferences from empty configmap', async () => {
    const res = await workspacePreferencesApiService.getWorkspacePreferences(namespace);

    expect(res[SKIP_AUTHORIZATION_KEY]).toEqual([]);
    expect(spyReadNamespacedConfigMap).toHaveBeenCalled();
    expect(spyPatchNamespacedConfigMap).not.toHaveBeenCalled();
  });

  test('get skip-authorisation workspace preferences from configmap with empty skip-authorisation', async () => {
    spyReadNamespacedConfigMap.mockResolvedValueOnce({
      data: { [SKIP_AUTHORIZATION_KEY]: '[]' },
    } as mockClient.V1ConfigMap);
    const res = await workspacePreferencesApiService.getWorkspacePreferences(namespace);

    expect(res[SKIP_AUTHORIZATION_KEY]).toEqual([]);
    expect(spyReadNamespacedConfigMap).toHaveBeenCalled();
    expect(spyPatchNamespacedConfigMap).not.toHaveBeenCalled();
  });

  test('get skip-authorisation workspace preferences from configmap with skip-authorisation values', async () => {
    spyReadNamespacedConfigMap.mockResolvedValueOnce({
      data: { [SKIP_AUTHORIZATION_KEY]: '[github, gitlab, bitbucket]' },
    } as mockClient.V1ConfigMap);

    const res = await workspacePreferencesApiService.getWorkspacePreferences(namespace);

    expect(res[SKIP_AUTHORIZATION_KEY]).toEqual(['github', 'gitlab', 'bitbucket']);
    expect(spyReadNamespacedConfigMap).toHaveBeenCalled();
    expect(spyPatchNamespacedConfigMap).not.toHaveBeenCalled();
  });

  test('remove a provider from skip-authorisation workspace preferences', async () => {
    spyReadNamespacedConfigMap.mockResolvedValueOnce({
      data: { [SKIP_AUTHORIZATION_KEY]: '[github, gitlab, bitbucket]' },
    } as mockClient.V1ConfigMap);

    await workspacePreferencesApiService.removeProviderFromSkipAuthorizationList(
      namespace,
      'gitlab',
    );

    expect(spyReadNamespacedConfigMap).toHaveBeenCalled();
    expect(spyPatchNamespacedConfigMap).toHaveBeenCalled();
    expect(spyPatchNamespacedConfigMap).toHaveBeenCalledWith({
      name: DEV_WORKSPACE_PREFERENCES_CONFIGMAP,
      namespace: 'user-che',
      body: {
        data: { [SKIP_AUTHORIZATION_KEY]: '[github, bitbucket]' },
      },
    });
  });

  test('add a very first trusted source URL to trusted-source workspace preferences', async () => {
    spyReadNamespacedConfigMap.mockResolvedValueOnce({
      data: {},
    } as mockClient.V1ConfigMap);

    await workspacePreferencesApiService.addTrustedSource(namespace, 'source-url');

    expect(spyReadNamespacedConfigMap).toHaveBeenCalled();
    expect(spyPatchNamespacedConfigMap).toHaveBeenCalled();
    expect(spyPatchNamespacedConfigMap).toHaveBeenCalledWith({
      name: DEV_WORKSPACE_PREFERENCES_CONFIGMAP,
      namespace,
      body: {
        data: {
          [SKIP_AUTHORIZATION_KEY]: '[]',
          [TRUSTED_SOURCES_KEY]: '["source-url"]',
        },
      },
    });
  });

  test('add a new trusted source URL to trusted-source workspace preferences', async () => {
    spyReadNamespacedConfigMap.mockResolvedValueOnce({
      data: {
        [TRUSTED_SOURCES_KEY]: '["source1", "source2"]',
      },
    } as mockClient.V1ConfigMap);

    await workspacePreferencesApiService.addTrustedSource(namespace, 'source3');

    expect(spyReadNamespacedConfigMap).toHaveBeenCalled();
    expect(spyPatchNamespacedConfigMap).toHaveBeenCalled();
    expect(spyPatchNamespacedConfigMap).toHaveBeenCalledWith({
      name: DEV_WORKSPACE_PREFERENCES_CONFIGMAP,
      namespace,
      body: {
        data: {
          [SKIP_AUTHORIZATION_KEY]: '[]',
          [TRUSTED_SOURCES_KEY]: '["source1","source2","source3"]',
        },
      },
    });
  });

  test('add trust all to trusted-source workspace preferences when there is some trusted URLs', async () => {
    spyReadNamespacedConfigMap.mockResolvedValueOnce({
      data: {
        [TRUSTED_SOURCES_KEY]: '["source1", "source2"]',
      },
    } as mockClient.V1ConfigMap);

    await workspacePreferencesApiService.addTrustedSource(namespace, '*');

    expect(spyReadNamespacedConfigMap).toHaveBeenCalled();
    expect(spyPatchNamespacedConfigMap).toHaveBeenCalled();
    expect(spyPatchNamespacedConfigMap).toHaveBeenCalledWith({
      name: DEV_WORKSPACE_PREFERENCES_CONFIGMAP,
      namespace,
      body: {
        data: {
          [SKIP_AUTHORIZATION_KEY]: '[]',
          [TRUSTED_SOURCES_KEY]: '"*"',
        },
      },
    });
  });

  test('delete all trusted sources from trusted-source workspace preferences', async () => {
    spyReadNamespacedConfigMap.mockResolvedValueOnce({
      data: {
        [TRUSTED_SOURCES_KEY]: '["source1", "source2"]',
      },
    } as mockClient.V1ConfigMap);

    await workspacePreferencesApiService.removeTrustedSources(namespace);

    expect(spyReadNamespacedConfigMap).toHaveBeenCalled();
    expect(spyPatchNamespacedConfigMap).toHaveBeenCalled();
    expect(spyPatchNamespacedConfigMap).toHaveBeenCalledWith({
      name: DEV_WORKSPACE_PREFERENCES_CONFIGMAP,
      namespace,
      body: {
        data: {
          [SKIP_AUTHORIZATION_KEY]: '[]',
        },
      },
    });
  });
});
