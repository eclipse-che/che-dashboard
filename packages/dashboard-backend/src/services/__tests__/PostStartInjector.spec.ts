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

  // ── terminal phases ───────────────────────────────────────────────────────

  test.each(['Failed', 'Failing', 'Stopped', 'Stopping', 'Terminating'])(
    'stops everything and logs unsubscribe on %s phase via watch',
    async phase => {
      invoke();
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

  test('cleans up when workspace is already in terminal phase at startup', async () => {
    (devworkspaceApi.getByName as jest.Mock).mockResolvedValue({
      status: { phase: 'Failed' },
    });

    invoke();
    await flushMicrotasks();

    expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();
    expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);
  });

  test('does not double-inject when watch fires before initial check resolves', async () => {
    (devworkspaceApi.getByName as jest.Mock).mockResolvedValue({
      status: { phase: 'Running', devworkspaceId: 'ws-race-id' },
    });

    invoke();

    await capturedListener(dwMessage('Running', 'ws-race-id'));
    await flushMicrotasks();

    expect(kubeConfigApi.injectKubeConfig).toHaveBeenCalledTimes(1);
  });

  // ── parallel polling ──────────────────────────────────────────────────────

  describe('parallel polling', () => {
    test('polls every 2 s alongside the watch', () => {
      invoke();

      // Nothing before the first interval elapses
      jest.advanceTimersByTime(1999);
      expect(devworkspaceApi.getByName).toHaveBeenCalledTimes(1); // only initial check

      jest.advanceTimersByTime(1);
      // Initial check + first poll
      expect(devworkspaceApi.getByName).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(2000);
      expect(devworkspaceApi.getByName).toHaveBeenCalledTimes(3);
    });

    test('injects via poll when watch is silent', async () => {
      (devworkspaceApi.getByName as jest.Mock)
        .mockResolvedValueOnce({ status: { phase: 'Starting' } }) // initial check
        .mockResolvedValueOnce({ status: { phase: 'Starting' } }) // poll #1
        .mockResolvedValue({ status: { phase: 'Running', devworkspaceId: 'ws-poll-id' } });

      invoke();
      await flushMicrotasks();

      jest.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();

      jest.advanceTimersByTime(2000);
      await flushMicrotasks();

      expect(kubeConfigApi.injectKubeConfig).toHaveBeenCalledWith(namespace, 'ws-poll-id');
      expect(podmanApi.podmanLogin).toHaveBeenCalledWith(namespace, 'ws-poll-id');
      expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);
    });

    test('does not double-inject when watch and poll both detect Running', async () => {
      (devworkspaceApi.getByName as jest.Mock)
        .mockResolvedValueOnce({ status: { phase: 'Starting' } }) // initial check
        .mockResolvedValue({ status: { phase: 'Running', devworkspaceId: 'ws-both' } });

      invoke();
      await flushMicrotasks();

      await capturedListener(dwMessage('Running', 'ws-both'));
      jest.advanceTimersByTime(2000);
      await flushMicrotasks();

      expect(kubeConfigApi.injectKubeConfig).toHaveBeenCalledTimes(1);
    });

    test.each(['Failed', 'Failing', 'Stopped', 'Stopping', 'Terminating'])(
      'stops polling without injection when poll detects %s phase',
      async phase => {
        (devworkspaceApi.getByName as jest.Mock)
          .mockResolvedValueOnce({ status: { phase: 'Starting' } }) // initial check
          .mockResolvedValue({ status: { phase } }); // poll

        invoke();
        await flushMicrotasks();

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

      jest.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();

      jest.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(kubeConfigApi.injectKubeConfig).toHaveBeenCalledWith(namespace, 'ws-retry-id');
    });

    test('polling continues after watch ERROR', async () => {
      (devworkspaceApi.getByName as jest.Mock)
        .mockResolvedValueOnce({ status: { phase: 'Starting' } }) // initial check
        .mockResolvedValueOnce({ status: { phase: 'Starting' } }) // poll #1
        .mockResolvedValue({ status: { phase: 'Running', devworkspaceId: 'ws-after-err' } });

      invoke();
      await flushMicrotasks();

      await capturedListener(errorMessage());
      expect(devworkspaceApi.stopWatching).toHaveBeenCalled();

      jest.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();

      jest.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(kubeConfigApi.injectKubeConfig).toHaveBeenCalledWith(namespace, 'ws-after-err');
    });
  });

  // ── elapsed time logging ────────────────────────────────────────────────

  test('logs elapsed time when injection succeeds quickly', async () => {
    invoke();
    await capturedListener(dwMessage('Running', 'ws-123'));

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('0s after start request'));
    expect(logger.warn).not.toHaveBeenCalledWith(
      expect.stringContaining('exceeds the ~12s UDI entrypoint.sh window'),
    );
  });

  test('warns when injection exceeds the 12 s UDI entrypoint window', async () => {
    invoke();

    jest.advanceTimersByTime(15000);
    await capturedListener(dwMessage('Running', 'ws-slow'));

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('exceeds the ~12s UDI entrypoint.sh window'),
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Detection source: watch'));
  });

  // ── ownership guard (stale callback safety) ───────────────────────────────

  test('stale poll from old invocation does not tear down new invocation', async () => {
    // Simulate: start → terminal phase → restart → old poll resolves
    let oldPollResolve: (value: unknown) => void;
    const oldPollPromise = new Promise(resolve => {
      oldPollResolve = resolve;
    });

    // First invocation: getByName returns a deferred promise for the initial check,
    // and immediate Starting for poll setup
    (devworkspaceApi.getByName as jest.Mock).mockReturnValueOnce(oldPollPromise); // initial check — will resolve late

    invoke();
    // Terminal phase tears down first invocation
    await capturedListener(dwMessageNoId('Failed'));
    expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);

    // Second invocation with fresh mocks
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

    // Old poll resolves with Running — must NOT affect the new invocation
    oldPollResolve!({
      status: { phase: 'Running', devworkspaceId: 'ws-stale' },
    });
    await flushMicrotasks();

    // New invocation must still be active
    expect((PostStartInjector as any).activeWatches.has(key)).toBe(true);
    // No injection from the stale callback
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
