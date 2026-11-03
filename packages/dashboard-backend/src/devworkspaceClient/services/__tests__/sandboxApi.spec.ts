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

import * as mockClient from '@kubernetes/client-node';
import { ApisApi, CustomObjectsApi } from '@kubernetes/client-node';

import {
  SANDBOX_API_GROUP,
  SANDBOX_API_VERSION,
  SANDBOX_PLURAL,
  SandboxApiService,
} from '@/devworkspaceClient/services/sandboxApi';
import { ISandbox } from '@/devworkspaceClient/types';

const namespace = 'user-che';
const name = 'hello-world';

const sandbox: ISandbox = {
  apiVersion: `${SANDBOX_API_GROUP}/${SANDBOX_API_VERSION}`,
  kind: 'Sandbox',
  metadata: { name },
};

describe('Sandbox API Service', () => {
  let sandboxService: SandboxApiService;
  let apiGroups: { name: string; versions?: { version: string }[] }[];

  const stubCustomObjectsApi = {
    createNamespacedCustomObject: () => Promise.resolve(sandbox),
    deleteNamespacedCustomObject: () => Promise.resolve({}),
    getNamespacedCustomObject: () => Promise.resolve(sandbox),
    listNamespacedCustomObject: () => Promise.resolve({ items: [sandbox] }),
    patchNamespacedCustomObject: () => Promise.resolve(sandbox),
  } as unknown as CustomObjectsApi;

  const stubApisApi = {
    getAPIVersions: () => Promise.resolve({ groups: apiGroups }),
  } as unknown as ApisApi;

  const spyCreate = jest.spyOn(stubCustomObjectsApi, 'createNamespacedCustomObject');
  const spyDelete = jest.spyOn(stubCustomObjectsApi, 'deleteNamespacedCustomObject');
  const spyGet = jest.spyOn(stubCustomObjectsApi, 'getNamespacedCustomObject');
  const spyList = jest.spyOn(stubCustomObjectsApi, 'listNamespacedCustomObject');
  const spyPatch = jest.spyOn(stubCustomObjectsApi, 'patchNamespacedCustomObject');

  beforeEach(() => {
    apiGroups = [{ name: SANDBOX_API_GROUP, versions: [{ version: SANDBOX_API_VERSION }] }];

    const { KubeConfig } = mockClient;
    const kubeConfig = new KubeConfig();

    kubeConfig.makeApiClient = jest
      .fn()
      .mockImplementation(api => (api === ApisApi ? stubApisApi : stubCustomObjectsApi));

    sandboxService = new SandboxApiService(kubeConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isAvailable', () => {
    test('is true when the cluster serves the API group', async () => {
      expect(await sandboxService.isAvailable()).toBe(true);
    });

    test('is false when the group is missing', async () => {
      apiGroups = [{ name: 'workspace.devfile.io', versions: [{ version: 'v1alpha2' }] }];
      expect(await sandboxService.isAvailable()).toBe(false);
    });

    test('is false when the group is served at another version', async () => {
      // Every other call is pinned to SANDBOX_API_VERSION, so a name-only probe
      // would report the feature as available and then 404 on all of them.
      apiGroups = [{ name: SANDBOX_API_GROUP, versions: [{ version: 'v1alpha1' }] }];
      expect(await sandboxService.isAvailable()).toBe(false);
    });

    test('is false when the group lists no versions', async () => {
      apiGroups = [{ name: SANDBOX_API_GROUP }];
      expect(await sandboxService.isAvailable()).toBe(false);
    });

    test('is false rather than throwing when the discovery call fails', async () => {
      stubApisApi.getAPIVersions = () => Promise.reject(new Error('unreachable'));
      expect(await sandboxService.isAvailable()).toBe(false);
    });
  });

  test('listing in a namespace', async () => {
    expect(await sandboxService.listInNamespace(namespace)).toEqual({ items: [sandbox] });
    expect(spyList).toHaveBeenCalledWith({
      group: SANDBOX_API_GROUP,
      version: SANDBOX_API_VERSION,
      namespace,
      plural: SANDBOX_PLURAL,
    });
  });

  test('listing a collection without items', async () => {
    stubCustomObjectsApi.listNamespacedCustomObject = () => Promise.resolve({});
    expect(await sandboxService.listInNamespace(namespace)).toEqual({ items: [] });
  });

  test('getting by name', async () => {
    expect(await sandboxService.getByName(namespace, name)).toEqual(sandbox);
    expect(spyGet).toHaveBeenCalledWith({
      group: SANDBOX_API_GROUP,
      version: SANDBOX_API_VERSION,
      namespace,
      plural: SANDBOX_PLURAL,
      name,
    });
  });

  test('creating pins the namespace of the request path', async () => {
    await sandboxService.create(namespace, {
      ...sandbox,
      metadata: { name, namespace: 'someone-else' },
    });

    expect(spyCreate).toHaveBeenCalledWith({
      group: SANDBOX_API_GROUP,
      version: SANDBOX_API_VERSION,
      namespace,
      plural: SANDBOX_PLURAL,
      body: { ...sandbox, metadata: { name, namespace } },
    });
  });

  test('patching as a merge patch', async () => {
    const patch = { spec: { shutdown: true } };

    expect(await sandboxService.patch(namespace, name, patch)).toEqual(sandbox);
    expect(spyPatch).toHaveBeenCalledWith(
      {
        group: SANDBOX_API_GROUP,
        version: SANDBOX_API_VERSION,
        namespace,
        plural: SANDBOX_PLURAL,
        name,
        body: patch,
      },
      expect.anything(),
    );
  });

  test('deleting', async () => {
    await sandboxService.delete(namespace, name);
    expect(spyDelete).toHaveBeenCalledWith({
      group: SANDBOX_API_GROUP,
      version: SANDBOX_API_VERSION,
      namespace,
      plural: SANDBOX_PLURAL,
      name,
    });
  });

  // The call is retried before it gives up, so this one outlives the default timeout.
  test('reporting a failure as a labeled error', async () => {
    stubCustomObjectsApi.createNamespacedCustomObject = () =>
      Promise.reject(new Error('sandboxes is forbidden'));

    await expect(sandboxService.create(namespace, sandbox)).rejects.toThrow(
      'Unable to create sandbox in "user-che"',
    );
  }, 15000);
});
