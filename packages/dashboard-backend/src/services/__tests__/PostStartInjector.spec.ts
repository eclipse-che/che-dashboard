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
      // Default: return 'Starting' so the initial check does not trigger injection
      // in tests that do not explicitly override getByName.
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

  // ── initial immediate check (Race 1 fix) ─────────────────────────────────

  test('injects immediately when workspace is already Running at watch startup', async () => {
    // Simulates the race: workspace reached RUNNING before watch stream opened.
    (devworkspaceApi.getByName as jest.Mock).mockResolvedValue({
      status: { phase: 'Running', devworkspaceId: 'ws-already-running' },
    });

    invoke();
    // Flush the initial getByName() promise chain
    await Promise.resolve().then(() => Promise.resolve());

    expect(kubeConfigApi.injectKubeConfig).toHaveBeenCalledWith(namespace, 'ws-already-running');
    expect(podmanApi.podmanLogin).toHaveBeenCalledWith(namespace, 'ws-already-running');
    expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);
  });

  test('does not double-inject when watch listener fires before initial check resolves', async () => {
    // Both the watch listener and the initial getByName see Running.
    // The listener fires first (synchronously via capturedListener), removes the key,
    // then the initial check resolves and must be a no-op.
    (devworkspaceApi.getByName as jest.Mock).mockResolvedValue({
      status: { phase: 'Running', devworkspaceId: 'ws-race-id' },
    });

    invoke();

    // Simulate watch listener firing first
    await capturedListener(dwMessage('Running', 'ws-race-id'));
    // Now flush the initial check promise — key is already gone
    await Promise.resolve().then(() => Promise.resolve());

    expect(kubeConfigApi.injectKubeConfig).toHaveBeenCalledTimes(1);
  });

  // ── timeout ───────────────────────────────────────────────────────────────

  test('stops watch and starts polling fallback on 300 s timeout', () => {
    // Return 'Starting' so the initial check does not trigger injection.
    (devworkspaceApi.getByName as jest.Mock).mockResolvedValue({
      status: { phase: 'Starting' },
    });

    invoke();
    jest.advanceTimersByTime(300000);

    // Watch stopped
    expect(devworkspaceApi.stopWatching).toHaveBeenCalled();
    // Polling fallback re-registers the key so injection can still complete
    expect((PostStartInjector as any).activeWatches.has(key)).toBe(true);
  });

  test('injects credentials via polling fallback after watch timeout', async () => {
    // First call = initial check → Starting (no injection).
    // Subsequent calls (polling) → Running.
    (devworkspaceApi.getByName as jest.Mock)
      .mockResolvedValueOnce({ status: { phase: 'Starting' } })
      .mockResolvedValue({ status: { phase: 'Running', devworkspaceId: 'ws-timeout-id' } });

    invoke();
    jest.advanceTimersByTime(300000);

    // Advance one polling interval (2 s) so getByName is called
    jest.advanceTimersByTime(2000);
    await Promise.resolve().then(() => Promise.resolve());

    expect(kubeConfigApi.injectKubeConfig).toHaveBeenCalledWith(namespace, 'ws-timeout-id');
    expect(podmanApi.podmanLogin).toHaveBeenCalledWith(namespace, 'ws-timeout-id');
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
      // First call = initial check → Starting. Subsequent calls (poll) → Running.
      (devworkspaceApi.getByName as jest.Mock)
        .mockResolvedValueOnce({ status: { phase: 'Starting' } })
        .mockResolvedValue({ status: { phase: 'Running', devworkspaceId: 'ws-poll-id' } });

      await triggerErrorAndFlush();
      jest.advanceTimersByTime(2000);
      await Promise.resolve().then(() => Promise.resolve());

      expect(kubeConfigApi.injectKubeConfig).toHaveBeenCalledWith(namespace, 'ws-poll-id');
      expect(podmanApi.podmanLogin).toHaveBeenCalledWith(namespace, 'ws-poll-id');
      expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);
    });

    test.each(['Failed', 'Failing', 'Stopped', 'Stopping', 'Terminating'])(
      'stops polling without injection on %s phase',
      async phase => {
        // Initial check + poll both return the terminal phase (no injection either way).
        (devworkspaceApi.getByName as jest.Mock).mockResolvedValue({ status: { phase } });

        await triggerErrorAndFlush();
        jest.advanceTimersByTime(2000);
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
      jest.advanceTimersByTime(300000);

      expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();
      expect((PostStartInjector as any).activeWatches.has(key)).toBe(false);
    });

    test('poll interval is 2 s (catches RUNNING before entrypoint.sh gives up)', async () => {
      // The UDI entrypoint.sh waits ~12 s; 2 s poll gives ~6 attempts in that window.
      // First call = initial check → Starting. Poll at T+2 s → Running.
      (devworkspaceApi.getByName as jest.Mock)
        .mockResolvedValueOnce({ status: { phase: 'Starting' } })
        .mockResolvedValue({ status: { phase: 'Running', devworkspaceId: 'ws-fast-id' } });

      await triggerErrorAndFlush();

      // One 2 s poll — should inject without needing 10 s
      jest.advanceTimersByTime(2000);
      await Promise.resolve().then(() => Promise.resolve());

      expect(kubeConfigApi.injectKubeConfig).toHaveBeenCalledWith(namespace, 'ws-fast-id');
    });

    test('retries after a GET error during polling', async () => {
      // Call #1 (initial check) → rejection.
      // Call #2 (poll #1) → rejection.
      // Call #3 (poll #2) → Running.
      (devworkspaceApi.getByName as jest.Mock)
        .mockRejectedValueOnce(new Error('network error')) // initial check
        .mockRejectedValueOnce(new Error('network error')) // poll #1
        .mockResolvedValue({ status: { phase: 'Running', devworkspaceId: 'ws-retry-id' } });

      await triggerErrorAndFlush();

      jest.advanceTimersByTime(2000);
      await Promise.resolve().then(() => Promise.resolve());
      expect(kubeConfigApi.injectKubeConfig).not.toHaveBeenCalled();

      jest.advanceTimersByTime(2000);
      await Promise.resolve().then(() => Promise.resolve());
      expect(kubeConfigApi.injectKubeConfig).toHaveBeenCalledWith(namespace, 'ws-retry-id');
    });
  });
});
