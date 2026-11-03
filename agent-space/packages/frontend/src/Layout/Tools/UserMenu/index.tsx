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
  Divider,
  Dropdown,
  DropdownGroup,
  DropdownItem,
  DropdownList,
  Icon,
  MenuToggle,
  MenuToggleElement,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import { MoonIcon, SunIcon, WindowMaximizeIcon } from '@patternfly/react-icons';
import React from 'react';

import { useDashboardTheme } from '@/hooks/useDashboardTheme';
import { signOut } from '@/services/dashboard';
import { ThemePreference } from '@/services/theme';

/** Keep the selector's order; the keyboard shortcut walks it. */
const THEME_ORDER: ThemePreference[] = [
  ThemePreference.LIGHT,
  ThemePreference.DARK,
  ThemePreference.AUTO,
];

const THEME_SELECTOR_ITEM_ID = 'theme-selector';

export type Props = {
  username: string;
  /** Where the dashboard lives, so its User Preferences page can be opened. */
  userPreferencesUrl: string;
};

/** The username menu of the dashboard masthead: appearance, preferences, logout. */
export function UserMenu({ username, userPreferencesUrl }: Props): React.ReactElement {
  const [isOpen, setIsOpen] = React.useState(false);
  const { preference, setPreference } = useDashboardTheme();

  const onThemeKeyDown = (event: React.KeyboardEvent): void => {
    const current = THEME_ORDER.indexOf(preference);
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      event.stopPropagation();
      const step = event.key === 'ArrowRight' ? 1 : -1;
      setPreference(THEME_ORDER[(current + step + THEME_ORDER.length) % THEME_ORDER.length]);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      setPreference(THEME_ORDER[(current + 1) % THEME_ORDER.length]);
    }
  };

  return (
    <Dropdown
      isOpen={isOpen}
      onSelect={(_event, itemId) => {
        // The theme selector lives inside the menu; selecting it must not
        // close the menu the user is still adjusting.
        if (itemId !== THEME_SELECTOR_ITEM_ID) {
          setIsOpen(false);
        }
      }}
      onOpenChange={setIsOpen}
      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle
          ref={toggleRef}
          variant="plain"
          onClick={() => setIsOpen(current => !current)}
          isExpanded={isOpen}
          data-testid="user-menu-toggle"
        >
          {username}
        </MenuToggle>
      )}
      popperProps={{ position: 'right' }}
    >
      <DropdownGroup label="Appearance">
        <DropdownList>
          <DropdownItem
            itemId={THEME_SELECTOR_ITEM_ID}
            key={THEME_SELECTOR_ITEM_ID}
            component="div"
          >
            <div onKeyDown={onThemeKeyDown}>
              <ToggleGroup aria-label="Theme toggle group">
                <ToggleGroupItem
                  icon={
                    <Icon size="sm">
                      <SunIcon />
                    </Icon>
                  }
                  aria-label="light theme"
                  buttonId="toggle-group-light-theme"
                  isSelected={preference === ThemePreference.LIGHT}
                  onChange={() => setPreference(ThemePreference.LIGHT)}
                />
                <ToggleGroupItem
                  icon={
                    <Icon size="sm">
                      <MoonIcon />
                    </Icon>
                  }
                  aria-label="dark theme"
                  buttonId="toggle-group-dark-theme"
                  isSelected={preference === ThemePreference.DARK}
                  onChange={() => setPreference(ThemePreference.DARK)}
                />
                <ToggleGroupItem
                  icon={
                    <Icon size="sm">
                      <WindowMaximizeIcon />
                    </Icon>
                  }
                  aria-label="auto theme"
                  buttonId="toggle-group-auto-theme"
                  isSelected={preference === ThemePreference.AUTO}
                  onChange={() => setPreference(ThemePreference.AUTO)}
                />
              </ToggleGroup>
            </div>
          </DropdownItem>
        </DropdownList>
      </DropdownGroup>
      <Divider />
      <DropdownGroup label="Actions">
        <DropdownList>
          <DropdownItem
            key="user-preferences"
            data-testid="user-preferences-item"
            onClick={() => {
              window.location.href = userPreferencesUrl;
            }}
          >
            User Preferences
          </DropdownItem>
          <DropdownItem key="account_logout" data-testid="logout-item" onClick={() => signOut()}>
            Logout
          </DropdownItem>
        </DropdownList>
      </DropdownGroup>
    </Dropdown>
  );
}
