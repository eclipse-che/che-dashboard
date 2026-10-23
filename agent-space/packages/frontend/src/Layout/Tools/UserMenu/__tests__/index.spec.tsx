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

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { UserMenu } from '@/Layout/Tools/UserMenu';
import { signOut } from '@/services/dashboard';
import { DARK_THEME_CLASS, THEME_STORAGE_KEY, ThemePreference } from '@/services/theme';

jest.mock('@/services/dashboard', () => ({
  signOut: jest.fn(),
}));

const USER_PREFERENCES_URL = '../#/user-preferences';

function renderMenu(): void {
  render(<UserMenu username="kubeadmin" userPreferencesUrl={USER_PREFERENCES_URL} />);
}

async function openMenu(): Promise<void> {
  await userEvent.click(screen.getByTestId('user-menu-toggle'));
}

function storedPreference(): string | null {
  return window.localStorage.getItem(THEME_STORAGE_KEY);
}

describe('UserMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    document.documentElement.classList.remove(DARK_THEME_CLASS);
  });

  it('is labelled with the name of the signed-in user', () => {
    renderMenu();

    expect(screen.getByTestId('user-menu-toggle')).toHaveTextContent('kubeadmin');
  });

  it('keeps the menu closed until the toggle is clicked', async () => {
    renderMenu();
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();

    await openMenu();

    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('opens the User Preferences page of the dashboard', async () => {
    delete (window as Partial<Window>).location;
    Object.defineProperty(window, 'location', { writable: true, value: { href: '' } });
    renderMenu();
    await openMenu();

    await userEvent.click(screen.getByRole('menuitem', { name: 'User Preferences' }));

    expect(window.location.href).toBe(USER_PREFERENCES_URL);
  });

  it('signs the user out', async () => {
    renderMenu();
    await openMenu();

    await userEvent.click(screen.getByRole('menuitem', { name: 'Logout' }));

    expect(signOut).toHaveBeenCalled();
  });

  describe('the appearance selector', () => {
    it('marks the theme currently in use', async () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, ThemePreference.DARK);
      renderMenu();

      await openMenu();

      expect(screen.getByLabelText('dark theme')).toHaveClass('pf-m-selected');
      expect(screen.getByLabelText('light theme')).not.toHaveClass('pf-m-selected');
    });

    it('switches the whole page to the chosen theme', async () => {
      renderMenu();
      await openMenu();

      await userEvent.click(screen.getByLabelText('dark theme'));

      expect(storedPreference()).toBe(ThemePreference.DARK);
      expect(document.documentElement).toHaveClass(DARK_THEME_CLASS);
    });

    it('stays open while the theme is being adjusted', async () => {
      renderMenu();
      await openMenu();

      await userEvent.click(screen.getByLabelText('dark theme'));

      expect(screen.getByLabelText('light theme')).toBeInTheDocument();
    });

    it('steps forward through the themes with the right arrow', async () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, ThemePreference.LIGHT);
      renderMenu();
      await openMenu();
      screen.getByLabelText('light theme').focus();

      await userEvent.keyboard('{ArrowRight}');
      expect(storedPreference()).toBe(ThemePreference.DARK);

      await userEvent.keyboard('{ArrowRight}');
      expect(storedPreference()).toBe(ThemePreference.AUTO);
    });

    it('wraps around when stepping back from the first theme', async () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, ThemePreference.LIGHT);
      renderMenu();
      await openMenu();
      screen.getByLabelText('light theme').focus();

      await userEvent.keyboard('{ArrowLeft}');

      expect(storedPreference()).toBe(ThemePreference.AUTO);
    });

    it.each(['{Enter}', ' '])('steps forward with %s too', async key => {
      window.localStorage.setItem(THEME_STORAGE_KEY, ThemePreference.LIGHT);
      renderMenu();
      await openMenu();
      screen.getByLabelText('light theme').focus();

      await userEvent.keyboard(key);

      expect(storedPreference()).toBe(ThemePreference.DARK);
    });

    it('ignores keys it has no meaning for', async () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, ThemePreference.LIGHT);
      renderMenu();
      await openMenu();
      screen.getByLabelText('light theme').focus();

      await userEvent.keyboard('{ArrowDown}');

      expect(storedPreference()).toBe(ThemePreference.LIGHT);
    });
  });
});
