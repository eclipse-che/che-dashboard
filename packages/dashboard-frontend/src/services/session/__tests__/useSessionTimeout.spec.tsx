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
jest.mock('axios', () => ({ get: (...args: unknown[]) => mockGet(...args) }));

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
