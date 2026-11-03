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

import {
  applyStoredTheme,
  DARK_THEME_CLASS,
  isDarkTheme,
  readThemePreference,
  THEME_STORAGE_KEY,
  ThemePreference,
} from '@/services/theme';

function mockPrefersDark(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (media: string) =>
      ({
        matches,
        media,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }) as unknown as MediaQueryList,
  });
}

describe('theme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove(DARK_THEME_CLASS);
    mockPrefersDark(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.documentElement.classList.remove(DARK_THEME_CLASS);
  });

  describe('readThemePreference', () => {
    it.each([ThemePreference.LIGHT, ThemePreference.DARK, ThemePreference.AUTO])(
      'should read the stored %s preference',
      preference => {
        window.localStorage.setItem(THEME_STORAGE_KEY, preference);

        expect(readThemePreference()).toEqual(preference);
      },
    );

    it('should fall back to AUTO when nothing is stored', () => {
      expect(readThemePreference()).toEqual(ThemePreference.AUTO);
    });

    it('should fall back to AUTO on an unrecognized value', () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, 'SEPIA');

      expect(readThemePreference()).toEqual(ThemePreference.AUTO);
    });

    it('should fall back to AUTO when storage is not readable', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('storage is blocked');
      });

      expect(readThemePreference()).toEqual(ThemePreference.AUTO);
    });
  });

  describe('isDarkTheme', () => {
    it('should be dark when the preference is DARK', () => {
      expect(isDarkTheme(ThemePreference.DARK)).toBe(true);
    });

    it('should be light when the preference is LIGHT', () => {
      mockPrefersDark(true);

      expect(isDarkTheme(ThemePreference.LIGHT)).toBe(false);
    });

    it.each([
      [true, true],
      [false, false],
    ])('should follow the OS when AUTO and prefers-dark is %s', (prefersDark, expected) => {
      mockPrefersDark(prefersDark);

      expect(isDarkTheme(ThemePreference.AUTO)).toBe(expected);
    });
  });

  describe('applyStoredTheme', () => {
    it('should add the dark class for a dark preference', () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, ThemePreference.DARK);

      applyStoredTheme();

      expect(document.documentElement).toHaveClass(DARK_THEME_CLASS);
    });

    it('should remove the dark class for a light preference', () => {
      document.documentElement.classList.add(DARK_THEME_CLASS);
      window.localStorage.setItem(THEME_STORAGE_KEY, ThemePreference.LIGHT);

      applyStoredTheme();

      expect(document.documentElement).not.toHaveClass(DARK_THEME_CLASS);
    });
  });
});
