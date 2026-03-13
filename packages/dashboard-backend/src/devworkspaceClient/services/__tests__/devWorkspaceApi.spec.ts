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

import { V1alpha2DevWorkspace } from '@devfile/api';
import {
  devworkspaceGroup,
  devworkspaceLatestVersion,
  devworkspacePlural,
} from '@devfile/api/constants/constants';
import { api } from '@eclipse-che/common';
import * as mockClient from '@kubernetes/client-node';
import { CustomObjectsApi } from '@kubernetes/client-node';

import { DevWorkspaceApiService } from '@/devworkspaceClient/services/devWorkspaceApi';
import { logger } from '@/utils/logger';

jest.mock('../helpers/prepareCustomObjectWatch');
jest.mock('../helpers/retryableExec');

const namespace = 'user-che';
const name = 'wksp-name';

describe('DevWorkspace API Service', () => {
  let devWorkspaceService: DevWorkspaceApiService;

  const stubCustomObjectsApi = {
    createNamespacedCustomObject: () => {
      return Promise.resolve(getDevWorkspace());
    },
    deleteNamespacedCustomObject: () => {
      return Promise.resolve({});
    },
    getNamespacedCustomObject: () => {
      return Promise.resolve(getDevWorkspace());
    },
    listNamespacedCustomObject: () => {
      return Promise.resolve(buildListNamespacesCustomObject());
    },
    patchNamespacedCustomObject: () => {
      return Promise.resolve(getDevWorkspace());
    },
    replaceNamespacedCustomObject: () => {
      return Promise.resolve(getDevWorkspace());
    },
  } as unknown as CustomObjectsApi;

  const spyCreateNamespacedCustomObject = jest.spyOn(
    stubCustomObjectsApi,
    'createNamespacedCustomObject',
  );
  const spyDeleteNamespacedCustomObject = jest.spyOn(
    stubCustomObjectsApi,
    'deleteNamespacedCustomObject',
  );
  const spyGetNamespacedCustomObject = jest.spyOn(
    stubCustomObjectsApi,
    'getNamespacedCustomObject',
  );
  const spyListNamespacedCustomObject = jest.spyOn(
    stubCustomObjectsApi,
    'listNamespacedCustomObject',
  );
  const spyPatchNamespacedCustomObject = jest.spyOn(
    stubCustomObjectsApi,
    'patchNamespacedCustomObject',
  );

  beforeEach(() => {
    const { KubeConfig } = mockClient;
    const kubeConfig = new KubeConfig();

    kubeConfig.makeApiClient = jest.fn().mockImplementation(_api => stubCustomObjectsApi);

    devWorkspaceService = new DevWorkspaceApiService(kubeConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('getting devWorkspaces list', async () => {
    const res = await devWorkspaceService.listInNamespace(namespace);
    expect(res).toEqual(buildListNamespacesCustomObject());
    expect(spyListNamespacedCustomObject).toHaveBeenCalledWith({
      group: devworkspaceGroup,
      version: devworkspaceLatestVersion,
      namespace,
      plural: devworkspacePlural,
    });
  });

  test('getting by name', async () => {
    const res = await devWorkspaceService.getByName(namespace, name);
    expect(res).toEqual(getDevWorkspace());
    expect(spyGetNamespacedCustomObject).toHaveBeenCalledWith({
      group: devworkspaceGroup,
      version: devworkspaceLatestVersion,
      namespace,
      plural: devworkspacePlural,
      name,
    });
  });

  test('creating', async () => {
    const devWorkspace = {
      apiVersion: 'workspace.devfile.io/v1alpha2',
      kind: 'DevWorkspace',
      metadata: {
        name: 'wksp-name',
        namespace,
      },
    } as V1alpha2DevWorkspace;

    const res = await devWorkspaceService.create(devWorkspace, namespace);
    expect(res.devWorkspace).toStrictEqual(getDevWorkspace());
    expect(res.headers).toStrictEqual({});
    expect(spyCreateNamespacedCustomObject).toHaveBeenCalledWith({
      group: devworkspaceGroup,
      version: devworkspaceLatestVersion,
      namespace,
      plural: devworkspacePlural,
      body: devWorkspace,
    });
  });

  test('patching', async () => {
    const patches: api.IPatch[] = [
      {
        op: 'replace',
        path: '/metadata/annotations',
        value: {},
      },
    ];

    const res = await devWorkspaceService.patch(namespace, name, patches);
    expect(res.devWorkspace).toStrictEqual(getDevWorkspace());
    expect(res.headers).toStrictEqual({});
    expect(spyPatchNamespacedCustomObject).toHaveBeenCalledWith(
      {
        group: devworkspaceGroup,
        version: devworkspaceLatestVersion,
        namespace,
        plural: devworkspacePlural,
        name,
        body: patches,
      },
      expect.anything(),
    );
  });

  test('deleting', async () => {
    await devWorkspaceService.delete(namespace, name);
    expect(spyDeleteNamespacedCustomObject).toHaveBeenCalledWith({
      group: devworkspaceGroup,
      version: devworkspaceLatestVersion,
      namespace,
      plural: devworkspacePlural,
      name,
    });
  });

  test('should handle watch rejection and notify listener with StatusMessage', async () => {
    const listener = jest.fn();
    const params: api.webSocket.SubscribeParams = {
      namespace,
      resourceVersion: '123',
    };

    jest
      .spyOn((devWorkspaceService as any).customObjectWatch, 'watch')
      .mockRejectedValue(Object.assign(new Error('Unauthorized'), { statusCode: 401 }));

    await devWorkspaceService.watchInNamespace(listener, params);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Unauthorized' }),
      expect.stringContaining('Failed to start watching'),
    );
    expect(listener).toHaveBeenCalledWith({
      eventPhase: 'ERROR',
      status: expect.objectContaining({ message: 'Unauthorized', code: 401 }),
      params,
    });
  });

  test('should watch devworkspaces', async () => {
    const spyStopWatching = jest
      .spyOn(devWorkspaceService, 'stopWatching')
      .mockReturnValue(undefined);
    const spyWatch = jest.spyOn((devWorkspaceService as any).customObjectWatch, 'watch');
    const params: api.webSocket.SubscribeParams = {
      namespace,
      resourceVersion: '123',
    };

    await devWorkspaceService.watchInNamespace(jest.fn(), params);

    expect(spyStopWatching).toHaveBeenCalled();
    expect(spyWatch).toHaveBeenCalledWith(
      expect.stringContaining('/watch/namespaces/'),
      { watch: true, resourceVersion: '123' },
      expect.any(Function),
      expect.any(Function),
    );
  });

  test('should stop watching devworkspaces', async () => {
    const mockAbort = jest.fn();
    jest
      .spyOn((devWorkspaceService as any).customObjectWatch, 'watch')
      .mockResolvedValue({ abort: mockAbort } as unknown as AbortController);
    const params: api.webSocket.SubscribeParams = {
      namespace,
      resourceVersion: '123',
    };

    await devWorkspaceService.watchInNamespace(jest.fn(), params);
    devWorkspaceService.stopWatching();

    expect(mockAbort).toHaveBeenCalledTimes(1);
  });

  test('should invoke done callback and notify listener on watch error', async () => {
    const listener = jest.fn();
    const params: api.webSocket.SubscribeParams = {
      namespace,
      resourceVersion: '123',
    };

    let doneCb: (error: unknown) => void = () => {};
    jest
      .spyOn((devWorkspaceService as any).customObjectWatch, 'watch')
      .mockImplementation((...args: unknown[]) => {
        doneCb = args[3] as (error: unknown) => void;
        return Promise.resolve({ abort: jest.fn() });
      });

    await devWorkspaceService.watchInNamespace(listener, params);

    doneCb(Object.assign(new Error('Unauthorized'), { statusCode: 401 }));

    expect(listener).toHaveBeenCalledWith({
      eventPhase: 'ERROR',
      status: expect.objectContaining({ message: 'Unauthorized', code: 401 }),
      params,
    });
  });

  test('should ignore AbortError in done callback', async () => {
    const listener = jest.fn();
    const params: api.webSocket.SubscribeParams = {
      namespace,
      resourceVersion: '123',
    };

    let doneCb: (error: unknown) => void = () => {};
    jest
      .spyOn((devWorkspaceService as any).customObjectWatch, 'watch')
      .mockImplementation((...args: unknown[]) => {
        doneCb = args[3] as (error: unknown) => void;
        return Promise.resolve({ abort: jest.fn() });
      });

    await devWorkspaceService.watchInNamespace(listener, params);

    const abortError = new Error('The user aborted a request.');
    abortError.name = 'AbortError';
    doneCb(abortError);

    expect(logger.warn).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });
});

function buildListNamespacesCustomObject(): api.IDevWorkspaceList {
  return {
    apiVersion: 'workspace.devfile.io/v1alpha2',
    items: buildDevWorkspacesList(),
    kind: 'DevWorkspaceList',
    metadata: {
      resourceVersion: '12345',
    },
  };
}
function buildDevWorkspacesList() {
  return [getDevWorkspace(), getDevWorkspace()];
}
function getDevWorkspace() {
  return {
    apiVersion: 'workspace.devfile.io/v1alpha2',
    kind: 'DevWorkspace',
  };
}
