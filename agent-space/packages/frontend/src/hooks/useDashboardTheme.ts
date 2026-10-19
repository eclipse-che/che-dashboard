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

import React from 'react';

import {
  applyStoredTheme,
  DARK_MEDIA_QUERY,
  isDarkTheme,
  readThemePreference,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  ThemePreference,
  writeThemePreference,
} from '@/services/theme';

export interface DashboardTheme {
  isDarkTheme: boolean;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

/**
 * Keeps Agent Space on the theme the dashboard is using, and reports whether
 * that theme is the dark one so theme-aware assets can follow it.
 *
 * Three things can change it while the app is open: the operating system, when
 * the stored preference is AUTO; the dashboard itself in another tab, which
 * reaches us as a storage event; and the masthead of this page, which reaches
 * every instance of this hook as {@link THEME_CHANGE_EVENT}.
 */
export function useDashboardTheme(): DashboardTheme {
  const [preference, setLocalPreference] = React.useState(readThemePreference);
  const [isDark, setIsDark] = React.useState(() => isDarkTheme(readThemePreference()));

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY);

    const sync = () => {
      applyStoredTheme();
      const stored = readThemePreference();
      setLocalPreference(stored);
      setIsDark(isDarkTheme(stored));
    };

    const onStorage = (event: StorageEvent) => {
      // A null key means storage was cleared outright.
      if (event.key === null || event.key === THEME_STORAGE_KEY) {
        sync();
      }
    };

    sync();
    mediaQuery.addEventListener('change', sync);
    window.addEventListener('storage', onStorage);
    window.addEventListener(THEME_CHANGE_EVENT, sync);

    return () => {
      mediaQuery.removeEventListener('change', sync);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(THEME_CHANGE_EVENT, sync);
    };
  }, []);

  const setPreference = React.useCallback((next: ThemePreference) => {
    writeThemePreference(next);
  }, []);

  return { isDarkTheme: isDark, preference, setPreference };
}
