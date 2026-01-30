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

import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemePreference = string;
export const ThemePreference = {
  LIGHT: 'LIGHT',
  DARK: 'DARK',
  AUTO: 'AUTO',
};

interface ThemeContextValue {
  themePreference: ThemePreference;
  isDarkTheme: boolean;
  setThemePreference: (value: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themePreference: ThemePreference.AUTO,
  isDarkTheme: false,
  setThemePreference: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const storageKey = 'che-theme-preference';
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    const stored = localStorage.getItem(storageKey);
    return ThemePreference[stored as keyof typeof ThemePreference] !== undefined
      ? stored!
      : ThemePreference.AUTO;
  });

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  useEffect(() => {
    const mediaQueryListener = (e: MediaQueryListEvent) => {
      if (themePreference === ThemePreference.AUTO) {
        setIsDarkTheme(e.matches);
      }
    };

    const browserPreference = mediaQuery.matches ? ThemePreference.DARK : ThemePreference.LIGHT;

    switch (themePreference) {
      case ThemePreference.LIGHT:
        localStorage.setItem(storageKey, ThemePreference.LIGHT);
        setIsDarkTheme(false);
        break;
      case ThemePreference.DARK:
        localStorage.setItem(storageKey, ThemePreference.DARK);
        setIsDarkTheme(true);
        break;
      case ThemePreference.AUTO:
        mediaQuery.addEventListener('change', mediaQueryListener);
        setIsDarkTheme(browserPreference === ThemePreference.DARK);
        localStorage.setItem(storageKey, ThemePreference.AUTO);

        return () => {
          mediaQuery.removeEventListener('change', mediaQueryListener);
        };
    }
  }, [themePreference, mediaQuery]);

  useEffect(() => {
    document.documentElement.classList.toggle('pf-v6-theme-dark', isDarkTheme);
  }, [isDarkTheme]);

  return (
    <ThemeContext.Provider value={{ themePreference, isDarkTheme, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
