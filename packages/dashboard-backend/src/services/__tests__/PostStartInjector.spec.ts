/*
 * Copyright (c) 2018-2026 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { V1alpha2DevWorkspace } from '@devfile/api';
import * as k8s from '@kubernetes/client-node';

import { IKubeConfigApi, IPodmanApi } from '@/devworkspaceClient/types';
import { PostStartInjector } from '@/services/PostStartInjector';

type WatchCallback = (phase: string, obj: V1alpha2DevWorkspace) => Promise<void>;
type DoneCallback = (error: unknown) => void;

let watchCallback: WatchCallback;
let doneCallback: DoneCallback;
let watchPromiseResolve: (ac: AbortController) => void;
let watchPromiseReject: (error: unknown) => void;

const mockAbortController = { abort: jest.fn() } as unknown as AbortController;

const mockWatch = jest.fn().mockImplementation((_path, _params, cb, doneCb) => {
  watchCallback = cb;
  doneCallback = doneCb;
  return new Promise<AbortController>((resolve, reject) => {
    watchPromiseResolve = resolve;
    watchPromiseReject = reject;
  });
});

jest.mock('@kubernetes/client-node', () => {
  const original = jest.requireActual('@kubernetes/client-node');
  return {
    ...original,
    Watch: jest.fn().mockImplementation(() => ({
      watch: mockWatch,
    })),
  };
});

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('PostStartInjector', () => {
  const namespace = 'user-che';
  const workspaceName = 'my-workspace';
  let kc: k8s.KubeConfig;
  let kubeConfigApi: IKubeConfigApi;
  let podmanApi: IPodmanApi;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    // Reset static map between tests
    (PostStartInjector as any).activeWatches = new Map();

    kc = new k8s.KubeConfig();
    kubeConfigApi = {
      injectKubeConfig: jest.fn().mockResolvedValue(undefined),
    } as unknown as IKubeConfigApi;
    podmanApi = {
      podmanLogin: jest.fn().mockResolvedValue(undefined),
    } as unknown as IPodmanApi;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should set up a watch and register in activeWatches', () => {
    PostStartInjector.watchAndInject(kc, namespace, workspaceName, kubeConfigApi, podmanApi);

    expect(mockWatch).toHaveBeenCalledTimes(1);
    expect((PostStartInjector as any).activeWatches.has(`${namespace}/${workspaceName}`)).toBe(
      true,
    );
  });

  test('should skip if watch already active for the same workspace', () => {
    PostStartInjector.watchAndInject(kc, namespace, workspaceName, kubeConfigApi, podmanApi);
    PostStartInjector.watchAndInject(kc, namespace, workspaceName, kubeConfigApi, podmanApi);

    expect(mockWatch).toHaveBeenCalledTimes(1);
  });

  test('should inject kubeconfig and podman on Running phase', async () => {
    PostStartInjector.watchAndInject(kc, namespace, workspaceName, kubeConfigApi, podmanApi);

    const dw: V1alpha2DevWorkspace = {
      status: { phase: 'Running', devworkspaceId: 'workspace123' },
    };
    await watchCallback('MODIFIED', dw);

    expect(kubeConfigApi.injectKubeConfig).toHaveBeenCalledWith(namespace, 'workspace123');
    expect(podmanApi.podmanLogin).toHaveBeenCalledWith(namespace, 'workspace123');
    expect((PostStartInjector as any).activeWatches.has(`${namespace}/${workspaceName}`)).toBe(
      false,
    );
  });

  test('should handle injectKubeConfig failure gracefully', async () => {
    (kubeConfigApi.injectKubeConfig as jest.Mock).mockRejectedValue(new Error('kubeconfig failed'));

    PostStartInjector.watchAndInject(kc, namespace, workspaceName, kubeConfigApi, podmanApi);

    const dw: V1alpha2DevWorkspace = {
      status: { phase: 'Running', devworkspaceId: 'workspace123' },
    };
    await watchCallback('MODIFIED', dw);

    expect(kubeConfigApi.injectKubeConfig).toHaveBeenCalled();
    expect(podmanApi.podmanLogin).toHaveBeenCalled();
  });

  test('should handle podmanLogin failure gracefully', async () => {
    (podmanApi.podmanLogin as jest.Mock).mockRejectedValue(new Error('podman failed'));

    PostStartInjector.watchAndInject(kc, namespace, workspaceName, kubeConfigApi, podmanApi);

    const dw: V1alpha2DevWorkspace = {
      status: { phase: 'Running', devworkspaceId: 'workspace123' },
    };
    await watchCallback('MODIFIED', dw);

    expect(podmanApi.podmanLogin).toHaveBeenCalled();
    expect((PostStartInjector as any).activeWatches.has(`${namespace}/${workspaceName}`)).toBe(
      false,
    );
  });

  test('should skip injection if Running but no devworkspaceId', async () => {
    PostStartInjector.watchAndInject(kc, namespace, workspaceName, kubeConfigApi, podmanApi);

    const dw = {
      status: { phase: 'Running' },
    } as V1alpha2DevWorkspace;
    await watchCallback('MODIFIED', dw);

    expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();
    expect(podmanApi.podmanLogin).not.toHaveBeenCalled();
  });

  test('should cleanup on Failed phase', async () => {
    PostStartInjector.watchAndInject(kc, namespace, workspaceName, kubeConfigApi, podmanApi);

    const dw = {
      status: { phase: 'Failed' },
    } as V1alpha2DevWorkspace;
    await watchCallback('MODIFIED', dw);

    expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();
    expect((PostStartInjector as any).activeWatches.has(`${namespace}/${workspaceName}`)).toBe(
      false,
    );
  });

  test('should cleanup on ERROR event phase', async () => {
    PostStartInjector.watchAndInject(kc, namespace, workspaceName, kubeConfigApi, podmanApi);

    const dw: V1alpha2DevWorkspace = {};
    await watchCallback('ERROR', dw);

    expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();
    expect((PostStartInjector as any).activeWatches.has(`${namespace}/${workspaceName}`)).toBe(
      false,
    );
  });

  test('should ignore non-terminal phases (e.g. Starting)', async () => {
    PostStartInjector.watchAndInject(kc, namespace, workspaceName, kubeConfigApi, podmanApi);

    const dw: V1alpha2DevWorkspace = {
      status: { phase: 'Starting', devworkspaceId: 'workspace123' },
    };
    await watchCallback('MODIFIED', dw);

    expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();
    expect((PostStartInjector as any).activeWatches.has(`${namespace}/${workspaceName}`)).toBe(
      true,
    );
  });

  test('should cleanup on watch connection lost (done callback)', () => {
    PostStartInjector.watchAndInject(kc, namespace, workspaceName, kubeConfigApi, podmanApi);

    doneCallback(new Error('connection lost'));

    expect((PostStartInjector as any).activeWatches.has(`${namespace}/${workspaceName}`)).toBe(
      false,
    );
  });

  test('should store real AbortController from .then()', async () => {
    PostStartInjector.watchAndInject(kc, namespace, workspaceName, kubeConfigApi, podmanApi);

    watchPromiseResolve(mockAbortController);
    await Promise.resolve();

    const stored = (PostStartInjector as any).activeWatches.get(`${namespace}/${workspaceName}`);
    expect(stored).toBe(mockAbortController);
  });

  test('should abort if watch already cleaned up before .then() fires', async () => {
    PostStartInjector.watchAndInject(kc, namespace, workspaceName, kubeConfigApi, podmanApi);

    // Simulate cleanup before .then() resolves
    (PostStartInjector as any).activeWatches.delete(`${namespace}/${workspaceName}`);

    watchPromiseResolve(mockAbortController);
    await Promise.resolve();

    expect(mockAbortController.abort).toHaveBeenCalled();
  });

  test('should cleanup on watch .catch()', async () => {
    PostStartInjector.watchAndInject(kc, namespace, workspaceName, kubeConfigApi, podmanApi);

    watchPromiseReject(new Error('watch failed'));
    // Wait for microtask
    await Promise.resolve().then(() => Promise.resolve());

    expect((PostStartInjector as any).activeWatches.has(`${namespace}/${workspaceName}`)).toBe(
      false,
    );
  });

  test('should cleanup on timeout', () => {
    PostStartInjector.watchAndInject(kc, namespace, workspaceName, kubeConfigApi, podmanApi);

    jest.advanceTimersByTime(60_000);

    expect((PostStartInjector as any).activeWatches.has(`${namespace}/${workspaceName}`)).toBe(
      false,
    );
  });
});
