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

export type UITheme = 'new' | 'current';

const STORAGE_KEY = 'che-dashboard-ui-theme';

interface UIThemeContextType {
  theme: UITheme;
  setTheme: (theme: UITheme) => void;
  isNewUI: boolean;
}

const UIThemeContext = createContext<UIThemeContextType>({
  theme: 'new',
  setTheme: () => {},
  isNewUI: true,
});

export const useUITheme = (): UIThemeContextType => useContext(UIThemeContext);

interface Props {
  children: React.ReactNode;
}

export const UIThemeProvider: React.FC<Props> = ({ children }) => {
  const [theme, setThemeState] = useState<UITheme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as UITheme) || 'new';
  });

  const setTheme = (newTheme: UITheme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  };

  useEffect(() => {
    // Apply theme class to document root
    document.documentElement.classList.remove('ui-theme-new', 'ui-theme-current');
    document.documentElement.classList.add(`ui-theme-${theme}`);
  }, [theme]);

  const value: UIThemeContextType = {
    theme,
    setTheme,
    isNewUI: theme === 'new',
  };

  return <UIThemeContext.Provider value={value}>{children}</UIThemeContext.Provider>;
};

export default UIThemeContext;
