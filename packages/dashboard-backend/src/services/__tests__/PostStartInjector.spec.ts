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

import { api } from '@eclipse-che/common';

import { IDevWorkspaceApi, IKubeConfigApi, IPodmanApi } from '@/devworkspaceClient/types';
import { PostStartInjector } from '@/services/PostStartInjector';
import { MessageListener } from '@/services/types/Observer';

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
  const key = `${namespace}/${workspaceName}`;

  let capturedListener: MessageListener;
  let devworkspaceApi: IDevWorkspaceApi;
  let kubeConfigApi: IKubeConfigApi;
  let podmanApi: IPodmanApi;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (PostStartInjector as any).activeWatches = new Map();

    devworkspaceApi = {
      watchInNamespace: jest.fn().mockImplementation((listener: MessageListener) => {
        capturedListener = listener;
        return Promise.resolve();
      }),
      stopWatching: jest.fn(),
      getByName: jest.fn(),
    } as unknown as IDevWorkspaceApi;

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

  // ── helpers ──────────────────────────────────────────────────────────────

  function dwMessage(
    phase: string,
    devworkspaceId: string,
    name = workspaceName,
  ): api.webSocket.DevWorkspaceMessage {
    return {
      eventPhase: api.webSocket.EventPhase.MODIFIED,
      devWorkspace: {
        metadata: { name },
        status: { phase, devworkspaceId },
      },
    };
  }

  function dwMessageNoId(phase: string): api.webSocket.DevWorkspaceMessage {
    return {
      eventPhase: api.webSocket.EventPhase.MODIFIED,
      devWorkspace: {
        metadata: { name: workspaceName },
        status: { phase },
      },
    } as api.webSocket.DevWorkspaceMessage;
  }

  function errorMessage(): api.webSocket.StatusMessage {
    return {
      eventPhase: api.webSocket.EventPhase.ERROR,
      status: { kind: 'Status', apiVersion: 'v1', status: 'Failure' },
      params: { namespace, resourceVersion: '0' },
    };
  }

  function invoke() {
    PostStartInjector.watchAndInject(
      namespace,
      workspaceName,
      devworkspaceApi,
      kubeConfigApi,
      podmanApi,
    );
  }

  // ── watch setup ───────────────────────────────────────────────────────────

  test('registers in activeWatches and calls watchInNamespace', () => {
    invoke();

    expect(devworkspaceApi.watchInNamespace).toHaveBeenCalledWith(expect.any(Function), {
      namespace,
      resourceVersion: '',
    });
    expect((PostStartInjector as any).activeWatches.has(key)).toBe(true);
  });

  test('skips if a watch is already active for the same workspace', () => {
    invoke();
    invoke();

    expect(devworkspaceApi.watchInNamespace).toHaveBeenCalledTimes(1);
  });

  // ── Running phase ─────────────────────────────────────────────────────────

  test('injects and unsubscribes on Running phase', async () => {
    invoke();
    await capturedListener(dwMessage('Running', 'ws-123'));

    expect(kubeConfigApi.injectKubeConfig).toHaveBeenCalledWith(namespace, 'ws-123');
    expect(podmanApi.podmanLogin).toHaveBeenCalledWith(namespace, 'ws-123');
    expect(devworkspaceApi.stopWatching).toHaveBeenCalled();
    expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);
  });

  test('skips injection when Running but devworkspaceId is missing', async () => {
    invoke();
    await capturedListener(dwMessageNoId('Running'));

    expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();
  });

  test('handles injectKubeConfig failure gracefully', async () => {
    (kubeConfigApi.injectKubeConfig as jest.Mock).mockRejectedValue(new Error('kube error'));
    invoke();
    await capturedListener(dwMessage('Running', 'ws-123'));

    expect(podmanApi.podmanLogin).toHaveBeenCalled();
    expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);
  });

  test('handles podmanLogin failure gracefully', async () => {
    (podmanApi.podmanLogin as jest.Mock).mockRejectedValue(new Error('podman error'));
    invoke();
    await capturedListener(dwMessage('Running', 'ws-123'));

    expect(kubeConfigApi.injectKubeConfig).toHaveBeenCalled();
    expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);
  });

  // ── terminal phases ───────────────────────────────────────────────────────

  test.each(['Failed', 'Failing', 'Stopped', 'Stopping', 'Terminating'])(
    'stops watching without injection on %s phase',
    async phase => {
      invoke();
      await capturedListener(dwMessageNoId(phase));

      expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();
      expect(devworkspaceApi.stopWatching).toHaveBeenCalled();
      expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);
    },
  );

  test('ignores non-terminal phases (e.g. Starting)', async () => {
    invoke();
    await capturedListener(dwMessage('Starting', 'ws-123'));

    expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();
    expect(devworkspaceApi.stopWatching).not.toHaveBeenCalled();
    expect((PostStartInjector as any).activeWatches.has(key)).toBe(true);
  });

  // ── filtering ─────────────────────────────────────────────────────────────

  test('ignores events for a different workspace name', async () => {
    invoke();
    await capturedListener(dwMessage('Running', 'ws-123', 'other-workspace')); // different name

    expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();
    expect((PostStartInjector as any).activeWatches.has(key)).toBe(true);
  });

  // ── timeout ───────────────────────────────────────────────────────────────

  test('cleans up on 60 s timeout', () => {
    invoke();
    jest.advanceTimersByTime(60_000);

    expect(devworkspaceApi.stopWatching).toHaveBeenCalled();
    expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);
  });

  // ── polling fallback (triggered by ERROR event) ───────────────────────────

  describe('polling fallback', () => {
    async function triggerErrorAndFlush(): Promise<void> {
      invoke();
      await capturedListener(errorMessage());
      await Promise.resolve().then(() => Promise.resolve());
    }

    test('starts polling when watch receives ERROR event', async () => {
      (devworkspaceApi.getByName as jest.Mock).mockResolvedValue({
        status: { phase: 'Starting' },
      });

      await triggerErrorAndFlush();

      // Watch stopped, but polling keeps the key registered
      expect(devworkspaceApi.stopWatching).toHaveBeenCalled();
      expect((PostStartInjector as any).activeWatches.has(key)).toBe(true);
    });

    test('injects on Running phase during polling', async () => {
      (devworkspaceApi.getByName as jest.Mock).mockResolvedValue({
        status: { phase: 'Running', devworkspaceId: 'ws-poll-id' },
      });

      await triggerErrorAndFlush();
      jest.advanceTimersByTime(10_000);
      await Promise.resolve().then(() => Promise.resolve());

      expect(kubeConfigApi.injectKubeConfig).toHaveBeenCalledWith(namespace, 'ws-poll-id');
      expect(podmanApi.podmanLogin).toHaveBeenCalledWith(namespace, 'ws-poll-id');
      expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);
    });

    test.each(['Failed', 'Failing', 'Stopped', 'Stopping', 'Terminating'])(
      'stops polling without injection on %s phase',
      async phase => {
        (devworkspaceApi.getByName as jest.Mock).mockResolvedValue({ status: { phase } });

        await triggerErrorAndFlush();
        jest.advanceTimersByTime(10_000);
        await Promise.resolve().then(() => Promise.resolve());

        expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();
        expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);
      },
    );

    test('stops polling after 300 s timeout', async () => {
      (devworkspaceApi.getByName as jest.Mock).mockResolvedValue({
        status: { phase: 'Starting' },
      });

      await triggerErrorAndFlush();
      jest.advanceTimersByTime(300_000);

      expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();
      expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);
    });

    test('retries after a GET error during polling', async () => {
      (devworkspaceApi.getByName as jest.Mock)
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue({ status: { phase: 'Running', devworkspaceId: 'ws-retry-id' } });

      await triggerErrorAndFlush();

      jest.advanceTimersByTime(10_000);
      await Promise.resolve().then(() => Promise.resolve());
      expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();

      jest.advanceTimersByTime(10_000);
      await Promise.resolve().then(() => Promise.resolve());
      expect(kubeConfigApi.injectKubeConfig).toHaveBeenCalledWith(namespace, 'ws-retry-id');
    });
  });
});
