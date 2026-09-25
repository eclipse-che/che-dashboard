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
import { logger } from '@/utils/logger';

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
      getByName: jest.fn().mockResolvedValue({ status: { phase: 'Starting' } }),
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

  async function flushMicrotasks(): Promise<void> {
    await jest.advanceTimersByTimeAsync(0);
  }

  // ── subscribe / setup ─────────────────────────────────────────────────────

  test('logs subscribe on start and calls watchInNamespace', () => {
    invoke();

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('subscribing for'));
    expect(devworkspaceApi.watchInNamespace).toHaveBeenCalledWith(expect.any(Function), {
      namespace,
      resourceVersion: '',
    });
    expect((PostStartInjector as any).activeWatches.has(key)).toBe(true);
  });

  test('skips if already active for the same workspace', () => {
    invoke();
    invoke();

    expect(devworkspaceApi.watchInNamespace).toHaveBeenCalledTimes(1);
  });

  // ── Running phase via watch ───────────────────────────────────────────────

  test('injects and logs unsubscribe when watch detects Running', async () => {
    invoke();
    await capturedListener(dwMessage('Running', 'ws-123'));

    expect(kubeConfigApi.injectKubeConfig).toHaveBeenCalledWith(namespace, 'ws-123');
    expect(podmanApi.podmanLogin).toHaveBeenCalledWith(namespace, 'ws-123');
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('unsubscribing for'));
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('kubeconfig injected successfully'),
    );
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('podman login completed'));
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

  // ── terminal phases (failure — always decisive) ──────────────────────────

  test.each(['Failed', 'Failing'])(
    'stops everything on %s phase via watch (always decisive)',
    async phase => {
      invoke();
      await capturedListener(dwMessageNoId(phase));

      expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('unsubscribing for'));
      expect(devworkspaceApi.stopWatching).toHaveBeenCalled();
      expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);
    },
  );

  // ── stale-phase guard (shutdown phases before reconciliation) ─────────────

  test.each(['Stopped', 'Stopping', 'Terminating'])(
    'ignores stale %s phase via watch before reconciliation',
    async phase => {
      invoke();
      await capturedListener(dwMessageNoId(phase));

      expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();
      expect((PostStartInjector as any).activeWatches.has(key)).toBe(true);
    },
  );

  test.each(['Stopped', 'Stopping', 'Terminating'])(
    'stops on %s phase via watch after reconciliation (Starting was seen)',
    async phase => {
      invoke();
      await capturedListener(dwMessage('Starting', 'ws-123'));
      await capturedListener(dwMessageNoId(phase));

      expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('unsubscribing for'));
      expect(devworkspaceApi.stopWatching).toHaveBeenCalled();
      expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);
    },
  );

  test('ignores non-terminal phases (e.g. Starting)', async () => {
    invoke();
    await capturedListener(dwMessage('Starting', 'ws-123'));

    expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();
    expect((PostStartInjector as any).activeWatches.has(key)).toBe(true);
  });

  // ── filtering ─────────────────────────────────────────────────────────────

  test('ignores events for a different workspace name', async () => {
    invoke();
    await capturedListener(dwMessage('Running', 'ws-123', 'other-workspace'));

    expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();
    expect((PostStartInjector as any).activeWatches.has(key)).toBe(true);
  });

  // ── initial immediate check ───────────────────────────────────────────────

  test('injects immediately when workspace is already Running at startup', async () => {
    (devworkspaceApi.getByName as jest.Mock).mockResolvedValue({
      status: { phase: 'Running', devworkspaceId: 'ws-already-running' },
    });

    invoke();
    await flushMicrotasks();

    expect(kubeConfigApi.injectKubeConfig).toHaveBeenCalledWith(namespace, 'ws-already-running');
    expect(podmanApi.podmanLogin).toHaveBeenCalledWith(namespace, 'ws-already-running');
    expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);
  });

  test('cleans up when workspace is already in Failed phase at startup', async () => {
    (devworkspaceApi.getByName as jest.Mock).mockResolvedValue({
      status: { phase: 'Failed' },
    });

    invoke();
    await flushMicrotasks();

    expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();
    expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);
  });

  test.each(['Stopped', 'Stopping', 'Terminating'])(
    'ignores stale %s phase in initial check (pre-reconcile)',
    async phase => {
      (devworkspaceApi.getByName as jest.Mock).mockResolvedValue({
        status: { phase },
      });

      invoke();
      await flushMicrotasks();

      expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();
      expect((PostStartInjector as any).activeWatches.has(key)).toBe(true);
    },
  );

  test('does not double-inject when watch fires before initial check resolves', async () => {
    (devworkspaceApi.getByName as jest.Mock).mockResolvedValue({
      status: { phase: 'Running', devworkspaceId: 'ws-race-id' },
    });

    invoke();

    await capturedListener(dwMessage('Running', 'ws-race-id'));
    await flushMicrotasks();

    expect(kubeConfigApi.injectKubeConfig).toHaveBeenCalledTimes(1);
  });

  // ── key retention during injection ────────────────────────────────────────

  test('keeps key in registry during injection to block duplicate invocations', async () => {
    let injectResolve: () => void;
    const injectPromise = new Promise<void>(resolve => {
      injectResolve = resolve;
    });
    (kubeConfigApi.injectKubeConfig as jest.Mock).mockReturnValue(injectPromise);

    invoke();
    const runningPromise = capturedListener(dwMessage('Running', 'ws-123'));

    expect((PostStartInjector as any).activeWatches.has(key)).toBe(true);

    invoke();
    expect(devworkspaceApi.watchInNamespace).toHaveBeenCalledTimes(1);

    injectResolve!();
    await runningPromise;

    expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);
  });

  // ── polling fallback (only after watch failure) ───────────────────────────

  describe('polling fallback', () => {
    test('does not poll before grace period expires', () => {
      invoke();

      jest.advanceTimersByTime(9999);
      // Only the initial check, no polling yet
      expect(devworkspaceApi.getByName).toHaveBeenCalledTimes(1);
    });

    test('starts polling after grace period when watch is silent', async () => {
      (devworkspaceApi.getByName as jest.Mock)
        .mockResolvedValueOnce({ status: { phase: 'Starting' } }) // initial check
        .mockResolvedValueOnce({ status: { phase: 'Starting' } }) // poll #1
        .mockResolvedValue({ status: { phase: 'Running', devworkspaceId: 'ws-silent' } });

      invoke();
      await flushMicrotasks();

      // No watch events — watch is silently dropped
      jest.advanceTimersByTime(10000);
      await flushMicrotasks();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('no decisive phase within grace period'),
      );

      // First poll: Starting
      jest.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();

      // Second poll: Running
      jest.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(kubeConfigApi.injectKubeConfig).toHaveBeenCalledWith(namespace, 'ws-silent');
      expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);
    });

    test('does not start polling after grace period if watch already resolved', async () => {
      invoke();
      await capturedListener(dwMessage('Running', 'ws-fast'));

      // Grace period fires but watch already handled it
      jest.advanceTimersByTime(10000);
      expect(kubeConfigApi.injectKubeConfig).toHaveBeenCalledTimes(1);
    });

    test('starts polling after watch ERROR and injects via poll', async () => {
      (devworkspaceApi.getByName as jest.Mock)
        .mockResolvedValueOnce({ status: { phase: 'Starting' } }) // initial check
        .mockResolvedValueOnce({ status: { phase: 'Starting' } }) // poll #1
        .mockResolvedValue({ status: { phase: 'Running', devworkspaceId: 'ws-after-err' } });

      invoke();
      await flushMicrotasks();

      await capturedListener(errorMessage());
      expect(devworkspaceApi.stopWatching).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('falling back to polling'));

      jest.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();

      jest.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(kubeConfigApi.injectKubeConfig).toHaveBeenCalledWith(namespace, 'ws-after-err');
      expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);
    });

    test.each(['Failed', 'Failing'])(
      'stops polling without injection when poll detects %s phase',
      async phase => {
        (devworkspaceApi.getByName as jest.Mock)
          .mockResolvedValueOnce({ status: { phase: 'Starting' } }) // initial check
          .mockResolvedValue({ status: { phase } }); // poll

        invoke();
        await flushMicrotasks();

        // Trigger watch failure to start polling
        await capturedListener(errorMessage());

        jest.advanceTimersByTime(2000);
        await flushMicrotasks();

        expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();
        expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);
      },
    );

    test.each(['Stopped', 'Stopping', 'Terminating'])(
      'ignores stale %s during polling before reconciliation',
      async phase => {
        (devworkspaceApi.getByName as jest.Mock)
          .mockResolvedValueOnce({ status: { phase: 'Stopped' } }) // initial check — stale
          .mockResolvedValue({ status: { phase } }); // poll — also stale

        invoke();
        await flushMicrotasks();

        await capturedListener(errorMessage());

        jest.advanceTimersByTime(2000);
        await flushMicrotasks();

        expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();
        expect((PostStartInjector as any).activeWatches.has(key)).toBe(true);
      },
    );

    test.each(['Stopped', 'Stopping', 'Terminating'])(
      'stops polling on %s after reconciliation (Starting was seen)',
      async phase => {
        (devworkspaceApi.getByName as jest.Mock)
          .mockResolvedValueOnce({ status: { phase: 'Starting' } }) // initial check — sets flag
          .mockResolvedValue({ status: { phase } }); // poll

        invoke();
        await flushMicrotasks();

        await capturedListener(errorMessage());

        jest.advanceTimersByTime(2000);
        await flushMicrotasks();

        expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();
        expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);
      },
    );

    test('retries after a GET error during polling', async () => {
      (devworkspaceApi.getByName as jest.Mock)
        .mockResolvedValueOnce({ status: { phase: 'Starting' } }) // initial check
        .mockRejectedValueOnce(new Error('network error')) // poll #1
        .mockResolvedValue({ status: { phase: 'Running', devworkspaceId: 'ws-retry-id' } });

      invoke();
      await flushMicrotasks();

      // Trigger watch failure to start polling
      await capturedListener(errorMessage());

      jest.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();

      jest.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(kubeConfigApi.injectKubeConfig).toHaveBeenCalledWith(namespace, 'ws-retry-id');
    });
  });

  // ── elapsed time logging ────────────────────────────────────────────────

  test('logs elapsed time when injection succeeds', async () => {
    invoke();
    await capturedListener(dwMessage('Running', 'ws-123'));

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('0s after start request'));
  });

  // ── ownership guard (stale callback safety) ───────────────────────────────

  test('stale poll from old invocation does not tear down new invocation', async () => {
    let oldPollResolve: (value: unknown) => void;
    const oldPollPromise = new Promise(resolve => {
      oldPollResolve = resolve;
    });

    (devworkspaceApi.getByName as jest.Mock).mockReturnValueOnce(oldPollPromise);

    invoke();
    await capturedListener(dwMessageNoId('Failed'));
    expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);

    const devworkspaceApi2 = {
      watchInNamespace: jest.fn().mockImplementation((listener: MessageListener) => {
        capturedListener = listener;
        return Promise.resolve();
      }),
      stopWatching: jest.fn(),
      getByName: jest.fn().mockResolvedValue({ status: { phase: 'Starting' } }),
    } as unknown as IDevWorkspaceApi;

    PostStartInjector.watchAndInject(
      namespace,
      workspaceName,
      devworkspaceApi2,
      kubeConfigApi,
      podmanApi,
    );
    expect((PostStartInjector as any).activeWatches.has(key)).toBe(true);

    oldPollResolve!({
      status: { phase: 'Running', devworkspaceId: 'ws-stale' },
    });
    await flushMicrotasks();

    expect((PostStartInjector as any).activeWatches.has(key)).toBe(true);
    expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();
  });

  // ── overall timeout ───────────────────────────────────────────────────────

  test('cleans up everything on 10 min overall timeout', () => {
    invoke();
    jest.advanceTimersByTime(600000);

    expect(devworkspaceApi.stopWatching).toHaveBeenCalled();
    expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);
  });

  test('logs diagnostic warning on overall timeout', () => {
    invoke();
    jest.advanceTimersByTime(600000);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('workspace may have started without kubeconfig injection'),
    );
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('unsubscribing for'));
  });

  test('does not inject after overall timeout', async () => {
    invoke();
    jest.advanceTimersByTime(600000);

    await capturedListener(dwMessage('Running', 'ws-late'));
    expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();
  });
});
