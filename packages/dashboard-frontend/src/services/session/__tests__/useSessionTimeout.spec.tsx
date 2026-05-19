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

const mockGet = jest.fn();
const mockInterceptorEject = jest.fn();

// Capture the response handler registered by the hook so tests can simulate
// completed requests and verify the idle timer resets correctly.
let capturedResponseHandler: ((r: unknown) => unknown) | null = null;

jest.mock('axios', () => ({
  get: (...args: unknown[]) => mockGet(...args),
  interceptors: {
    response: {
      use: (handler: (r: unknown) => unknown) => {
        capturedResponseHandler = handler;
        return 0;
      },
      eject: (...args: unknown[]) => mockInterceptorEject(...args),
    },
  },
}));

const mockSignOut = jest.fn();
jest.mock('@/services/helpers/login', () => ({ signOut: () => mockSignOut() }));

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
    mockGet.mockResolvedValue({});
    mockSignOut.mockClear();
    mockGet.mockClear();
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
    // sessionTimeout=120 s → keepAliveThreshold = max(30, (120-60)/2) = 30 s.
    // After 31 s of idle with no requests, any UI event triggers a silent ping
    // so the OAuth cookie is refreshed before the modal would appear at 60 s.
    renderHook(() => useSessionTimeout(), {
      wrapper: buildWrapper(buildStore(120)),
    });
    // Advance past the 30 s keep-alive threshold (modal does NOT open until 60 s)
    act(() => {
      jest.advanceTimersByTime(31_000);
    });
    await act(async () => {
      document.dispatchEvent(new MouseEvent('mousemove'));
      await Promise.resolve();
    });
    expect(mockGet).toHaveBeenCalledWith('/dashboard/api/user/id');
  });

  it('does not ping keep-alive when user is active but below the keep-alive threshold', () => {
    // At 10 s of idle the threshold (30 s) has not been reached — just reset JS timer.
    renderHook(() => useSessionTimeout(), {
      wrapper: buildWrapper(buildStore(120)),
    });
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove'));
    });
    expect(mockGet).not.toHaveBeenCalled();
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
    // Simulates background workspace polling: a request completes at 50 s,
    // which refreshes the OAuth cookie. The JS idle timer must also reset so
    // the modal fires 60 s after the last request — not 60 s after mount.
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

  it('onExtend pings keep-alive, closes modal, restarts idle timer', async () => {
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
    expect(mockGet).toHaveBeenCalledWith('/dashboard/api/user/id');
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
    mockGet.mockRejectedValueOnce(new Error('network error'));
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
