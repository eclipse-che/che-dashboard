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

/**
 * Agent Space is served from the dashboard's own origin, so it shares the
 * dashboard's localStorage and can follow the theme the user already chose
 * there. Without this the hand-off to `/dashboard/agent-space/` would reset
 * the appearance to light, because PatternFly only goes dark when the
 * `pf-v6-theme-dark` class is present on the document element.
 *
 * The key and the class below must stay in step with the dashboard's
 * `contexts/ThemeContext`, which owns the preference.
 */
export const THEME_STORAGE_KEY = 'che-theme-preference';

export const DARK_THEME_CLASS = 'pf-v6-theme-dark';

export const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

/**
 * Fired on `window` whenever this tab changes the preference.
 *
 * `storage` events only reach *other* tabs, so without this the masthead that
 * made the change would be the one part of the page not to follow it.
 */
export const THEME_CHANGE_EVENT = 'che-theme-change';

export const ThemePreference = {
  LIGHT: 'LIGHT',
  DARK: 'DARK',
  AUTO: 'AUTO',
} as const;

export type ThemePreference = (typeof ThemePreference)[keyof typeof ThemePreference];

function isThemePreference(value: string | null): value is ThemePreference {
  return value !== null && Object.prototype.hasOwnProperty.call(ThemePreference, value);
}

/**
 * Anything the dashboard has not written, or cannot be read because storage is
 * blocked, is treated as AUTO — the dashboard's own default.
 */
export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : ThemePreference.AUTO;
  } catch {
    return ThemePreference.AUTO;
  }
}

export function isDarkTheme(preference: ThemePreference): boolean {
  switch (preference) {
    case ThemePreference.DARK:
      return true;
    case ThemePreference.LIGHT:
      return false;
    default:
      return window.matchMedia(DARK_MEDIA_QUERY).matches;
  }
}

export function applyTheme(preference: ThemePreference): void {
  document.documentElement.classList.toggle(DARK_THEME_CLASS, isDarkTheme(preference));
}

export function applyStoredTheme(): void {
  applyTheme(readThemePreference());
}

/**
 * Records the preference where the dashboard reads it, so the choice carries
 * over to the rest of the product and back.
 */
export function writeThemePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage can be blocked; the theme still applies to this page.
  }
  applyTheme(preference);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}
