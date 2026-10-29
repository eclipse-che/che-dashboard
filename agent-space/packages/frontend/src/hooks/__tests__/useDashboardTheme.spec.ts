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

import { useDashboardTheme } from '@/hooks/useDashboardTheme';
import { DARK_THEME_CLASS, THEME_STORAGE_KEY, ThemePreference } from '@/services/theme';

let prefersDark = false;
const mediaListeners = new Set<EventListener>();

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (media: string) =>
      ({
        get matches() {
          return prefersDark;
        },
        media,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: (_type: string, listener: EventListener) => {
          mediaListeners.add(listener);
        },
        removeEventListener: (_type: string, listener: EventListener) => {
          mediaListeners.delete(listener);
        },
        dispatchEvent: jest.fn(),
      }) as unknown as MediaQueryList,
  });
});

function fireMediaChange(): void {
  act(() => {
    mediaListeners.forEach(listener => listener(new Event('change')));
  });
}

function fireStorage(key: string | null): void {
  act(() => {
    window.dispatchEvent(new StorageEvent('storage', { key }));
  });
}

function isDark(): boolean {
  return document.documentElement.classList.contains(DARK_THEME_CLASS);
}

describe('useDashboardTheme', () => {
  beforeEach(() => {
    prefersDark = false;
    mediaListeners.clear();
    window.localStorage.clear();
    document.documentElement.classList.remove(DARK_THEME_CLASS);
  });

  afterEach(() => {
    document.documentElement.classList.remove(DARK_THEME_CLASS);
  });

  it('should apply the stored dark preference on mount', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, ThemePreference.DARK);

    const { result } = renderHook(() => useDashboardTheme());

    expect(isDark()).toBe(true);
    expect(result.current.isDarkTheme).toBe(true);
  });

  it('should stay light when the dashboard is light', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, ThemePreference.LIGHT);

    const { result } = renderHook(() => useDashboardTheme());

    expect(isDark()).toBe(false);
    expect(result.current.isDarkTheme).toBe(false);
  });

  it('should follow the OS while the preference is AUTO', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, ThemePreference.AUTO);
    const { result } = renderHook(() => useDashboardTheme());
    expect(isDark()).toBe(false);
    expect(result.current.isDarkTheme).toBe(false);

    prefersDark = true;
    fireMediaChange();

    expect(isDark()).toBe(true);
    expect(result.current.isDarkTheme).toBe(true);
  });

  it('should pick up a preference changed in another tab', () => {
    const { result } = renderHook(() => useDashboardTheme());
    expect(isDark()).toBe(false);

    window.localStorage.setItem(THEME_STORAGE_KEY, ThemePreference.DARK);
    fireStorage(THEME_STORAGE_KEY);

    expect(isDark()).toBe(true);
    expect(result.current.isDarkTheme).toBe(true);
  });

  describe('changing the preference from this page', () => {
    it('records the choice where the dashboard reads it', () => {
      const { result } = renderHook(() => useDashboardTheme());

      act(() => result.current.setPreference(ThemePreference.DARK));

      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe(ThemePreference.DARK);
      expect(isDark()).toBe(true);
      expect(result.current.isDarkTheme).toBe(true);
      expect(result.current.preference).toBe(ThemePreference.DARK);
    });

    it('tells the rest of the page, which no storage event would reach', () => {
      // Two hooks stand in for the masthead and the logo, which have to agree.
      const masthead = renderHook(() => useDashboardTheme());
      const logo = renderHook(() => useDashboardTheme());

      act(() => masthead.result.current.setPreference(ThemePreference.DARK));

      expect(logo.result.current.isDarkTheme).toBe(true);
    });

    it('hands back to the operating system when set to AUTO', () => {
      prefersDark = true;
      const { result } = renderHook(() => useDashboardTheme());

      act(() => result.current.setPreference(ThemePreference.LIGHT));
      expect(result.current.isDarkTheme).toBe(false);

      act(() => result.current.setPreference(ThemePreference.AUTO));
      expect(result.current.isDarkTheme).toBe(true);
    });
  });

  it('should re-sync when storage is cleared outright', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, ThemePreference.DARK);
    renderHook(() => useDashboardTheme());
    expect(isDark()).toBe(true);

    window.localStorage.clear();
    fireStorage(null);

    expect(isDark()).toBe(false);
  });

  it('should ignore storage events for unrelated keys', () => {
    renderHook(() => useDashboardTheme());

    window.localStorage.setItem(THEME_STORAGE_KEY, ThemePreference.DARK);
    fireStorage('some-other-key');

    expect(isDark()).toBe(false);
  });

  it('should stop listening once unmounted', () => {
    const { unmount } = renderHook(() => useDashboardTheme());

    unmount();
    expect(mediaListeners.size).toEqual(0);

    window.localStorage.setItem(THEME_STORAGE_KEY, ThemePreference.DARK);
    fireStorage(THEME_STORAGE_KEY);

    expect(isDark()).toBe(false);
  });
});
