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

import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { Store } from 'redux';

import { useSessionTimeout } from '@/services/session/useSessionTimeout';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';

// Single mock for fetchServerConfig used by both backgroundPing and pingKeepAlive.
const mockFetchServerConfig = jest.fn();
jest.mock('@/services/backend-client/serverConfigApi', () => ({
  fetchServerConfig: () => mockFetchServerConfig(),
}));

// Track whether serverConfigReceiveAction was called (i.e. store is being updated).

const mockSignOut = jest.fn();
jest.mock('@/services/helpers/login', () => ({ signOut: () => mockSignOut() }));

// Mock the shared axios instance used for the response interceptor.
// Capture the handler so tests can simulate completed background requests.
const mockInterceptorEject = jest.fn();
let capturedResponseHandler: ((r: unknown) => unknown) | null = null;

jest.mock('@/services/axios-wrapper/getAxiosInstance', () => ({
  getAxiosInstance: () => ({
    interceptors: {
      response: {
        use: (handler: (r: unknown) => unknown) => {
          capturedResponseHandler = handler;
          return 0;
        },
        eject: (...args: unknown[]) => mockInterceptorEject(...args),
      },
    },
  }),
}));

const defaultTimeouts = {
  inactivityTimeout: -1,
  runTimeout: -1,
  startTimeout: 300,
  axiosRequestTimeout: 30000,
};

function buildStore(sessionTimeout: number): ReturnType<MockStoreBuilder['build']> {
  return new MockStoreBuilder()
    .withDwServerConfig({ timeouts: { ...defaultTimeouts, sessionTimeout } })
    .build();
}

function buildWrapper(store: Store) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };
}

describe('useSessionTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetchServerConfig.mockResolvedValue({});
    mockSignOut.mockClear();
    mockFetchServerConfig.mockClear();
    mockInterceptorEject.mockClear();
    capturedResponseHandler = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not open modal when sessionTimeout <= 0', () => {
    const { result } = renderHook(() => useSessionTimeout(), {
      wrapper: buildWrapper(buildStore(0)),
    });
    act(() => {
      jest.advanceTimersByTime(999999000);
    });
    expect(result.current.isModalOpen).toBe(false);
  });

  it('does not install interceptor when sessionTimeout is disabled', () => {
    renderHook(() => useSessionTimeout(), {
      wrapper: buildWrapper(buildStore(0)),
    });
    // The useEffect returns early, so the interceptor is never registered.
    expect(capturedResponseHandler).toBeNull();
  });

  it('does not open modal when sessionTimeout < 90 s (too short for a useful warning)', () => {
    const { result } = renderHook(() => useSessionTimeout(), {
      wrapper: buildWrapper(buildStore(89)),
    });
    act(() => {
      jest.advanceTimersByTime(999999000);
    });
    expect(result.current.isModalOpen).toBe(false);
  });

  it('opens modal after (sessionTimeout - 60) seconds of inactivity', () => {
    const { result } = renderHook(() => useSessionTimeout(), {
      wrapper: buildWrapper(buildStore(120)),
    });
    expect(result.current.isModalOpen).toBe(false);
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(result.current.isModalOpen).toBe(true);
  });

  it('silently pings keep-alive when user is active and session is approaching expiry', async () => {
    // sessionTimeout=120, WARNING_LEAD_SECONDS=60, AUTO_EXTEND_BUFFER=15
    // → keepAliveThreshold = (120 - 60 - 15) = 45 s
    // Modal would open at 60 s; keep-alive fires 15 s earlier when user is active.
    renderHook(() => useSessionTimeout(), {
      wrapper: buildWrapper(buildStore(120)),
    });
    // Advance past the 45 s keep-alive threshold (modal does NOT open until 60 s)
    act(() => {
      jest.advanceTimersByTime(46_000);
    });
    await act(async () => {
      document.dispatchEvent(new MouseEvent('mousemove'));
      await Promise.resolve();
    });
    expect(mockFetchServerConfig).toHaveBeenCalledTimes(1);
  });

  it('background ping calls fetchServerConfig exactly once (not multiple times)', async () => {
    // Verifies that the silent ping uses the proper API and not a raw fetch.
    renderHook(() => useSessionTimeout(), { wrapper: buildWrapper(buildStore(120)) });
    act(() => {
      jest.advanceTimersByTime(46_000);
    });
    await act(async () => {
      document.dispatchEvent(new MouseEvent('mousemove'));
      await Promise.resolve();
    });
    expect(mockFetchServerConfig).toHaveBeenCalledTimes(1);
  });

  it('does not fire concurrent background pings on rapid activity', async () => {
    // isPingingRef guard: second mousemove while a ping is in-flight must not
    // trigger a second fetch.
    renderHook(() => useSessionTimeout(), {
      wrapper: buildWrapper(buildStore(120)),
    });
    // Hold the first request pending so the guard stays active
    let resolveFirst!: () => void;
    mockFetchServerConfig.mockReturnValueOnce(
      new Promise<void>(resolve => {
        resolveFirst = resolve;
      }),
    );
    act(() => {
      jest.advanceTimersByTime(46_000);
    });
    await act(async () => {
      document.dispatchEvent(new MouseEvent('mousemove'));
      await Promise.resolve();
    });
    // Second mousemove while first is still in-flight
    await act(async () => {
      document.dispatchEvent(new MouseEvent('mousemove'));
      await Promise.resolve();
    });
    expect(mockFetchServerConfig).toHaveBeenCalledTimes(1);
    resolveFirst();
  });

  it('does not ping keep-alive when user is active but below the keep-alive threshold', () => {
    // At 10 s of idle the threshold (45 s) has not been reached — just reset JS timer.
    renderHook(() => useSessionTimeout(), {
      wrapper: buildWrapper(buildStore(120)),
    });
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove'));
    });
    expect(mockFetchServerConfig).not.toHaveBeenCalled();
  });

  it('resets idle timer on document activity', () => {
    const { result } = renderHook(() => useSessionTimeout(), {
      wrapper: buildWrapper(buildStore(120)),
    });
    act(() => {
      jest.advanceTimersByTime(50_000);
    });
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove'));
    });
    act(() => {
      jest.advanceTimersByTime(50_000);
    });
    expect(result.current.isModalOpen).toBe(false);
    act(() => {
      jest.advanceTimersByTime(15_000);
    });
    expect(result.current.isModalOpen).toBe(true);
  });

  it('resets idle timer when an authenticated request completes', () => {
    // Simulates background workspace polling: a request completes at 50 s via the
    // shared axios instance. The JS idle timer must also reset so the modal fires
    // 60 s after the last request — not 60 s after mount.
    const { result } = renderHook(() => useSessionTimeout(), {
      wrapper: buildWrapper(buildStore(120)),
    });
    act(() => {
      jest.advanceTimersByTime(50_000);
    });
    // Simulate a successful authenticated response (e.g., workspace-status poll)
    act(() => {
      capturedResponseHandler!({});
    });
    act(() => {
      jest.advanceTimersByTime(50_000);
    });
    expect(result.current.isModalOpen).toBe(false);
    act(() => {
      jest.advanceTimersByTime(15_000);
    });
    expect(result.current.isModalOpen).toBe(true);
  });

  it('does not reset idle timer via interceptor while modal is open', () => {
    // Once the modal is visible, an incoming response must NOT dismiss it —
    // the user must interact explicitly to extend or end the session.
    const { result } = renderHook(() => useSessionTimeout(), {
      wrapper: buildWrapper(buildStore(120)),
    });
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(result.current.isModalOpen).toBe(true);
    act(() => {
      capturedResponseHandler!({});
    });
    expect(result.current.isModalOpen).toBe(true);
  });

  it('ejects the axios interceptor on unmount', () => {
    const { unmount } = renderHook(() => useSessionTimeout(), {
      wrapper: buildWrapper(buildStore(120)),
    });
    unmount();
    expect(mockInterceptorEject).toHaveBeenCalledWith(0);
  });

  it('countdown decrements once per second', () => {
    const { result } = renderHook(() => useSessionTimeout(), {
      wrapper: buildWrapper(buildStore(120)),
    });
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(result.current.countdown).toBe(60);
    act(() => {
      jest.advanceTimersByTime(5_000);
    });
    expect(result.current.countdown).toBe(55);
  });

  it('calls signOut when countdown reaches 0', () => {
    renderHook(() => useSessionTimeout(), { wrapper: buildWrapper(buildStore(120)) });
    act(() => {
      jest.advanceTimersByTime(120_000);
    });
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('onExtend fetches server-config, closes modal, and restarts idle timer', async () => {
    const { result } = renderHook(() => useSessionTimeout(), {
      wrapper: buildWrapper(buildStore(120)),
    });
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(result.current.isModalOpen).toBe(true);
    await act(async () => {
      await result.current.onExtend();
    });
    expect(mockFetchServerConfig).toHaveBeenCalledTimes(1);
    expect(result.current.isModalOpen).toBe(false);
    act(() => {
      jest.advanceTimersByTime(59_000);
    });
    expect(result.current.isModalOpen).toBe(false);
  });

  it('onSignOut calls signOut()', () => {
    const { result } = renderHook(() => useSessionTimeout(), {
      wrapper: buildWrapper(buildStore(120)),
    });
    act(() => {
      result.current.onSignOut();
    });
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('restarts idle timer even if onExtend network call fails', async () => {
    mockFetchServerConfig.mockRejectedValueOnce(new Error('network error'));
    const { result } = renderHook(() => useSessionTimeout(), {
      wrapper: buildWrapper(buildStore(120)),
    });
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(result.current.isModalOpen).toBe(true);
    await act(async () => {
      try {
        await result.current.onExtend();
      } catch {
        /* expected */
      }
    });
    expect(result.current.isModalOpen).toBe(false);
    // idle timer restarted — modal should open again after another 60 s
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(result.current.isModalOpen).toBe(true);
  });

  it('keeps modal open when mouse activity occurs while modal is visible', () => {
    const { result } = renderHook(() => useSessionTimeout(), {
      wrapper: buildWrapper(buildStore(120)),
    });
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(result.current.isModalOpen).toBe(true);
    // mouse move must NOT dismiss the modal — user must interact explicitly
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove'));
    });
    expect(result.current.isModalOpen).toBe(true);
    // countdown continues — signOut fires when it reaches 0
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
