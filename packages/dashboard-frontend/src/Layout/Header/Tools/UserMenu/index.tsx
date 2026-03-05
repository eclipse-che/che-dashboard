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
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
} from '@patternfly/react-core';
import { MoonIcon, SunIcon, WindowMaximizeIcon } from '@patternfly/react-icons';
import { History } from 'history';
import React, { useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { ThemePreference, useTheme } from '@/contexts/ThemeContext';
import { ROUTE } from '@/Routes';
import { BrandingData } from '@/services/bootstrap/branding.constant';
import { infrastructureNamespacesActionCreators } from '@/store/InfrastructureNamespaces';

type Props = MappedProps & {
  branding: BrandingData;
  history: History;
  username: string;
  logout: () => void;
};

const UserMenuComponent: React.FC<Props> = ({ history, username, logout }) => {
  const [isOpened, setIsOpened] = useState(false);
  const { themePreference, setThemePreference } = useTheme();

  const onUsernameSelect = (
    _event?: React.MouseEvent<Element, MouseEvent>,
    itemId?: string | number,
  ) => {
    if (itemId === 'theme-selector') {
      // Keep menu open when interacting with theme toggle
      return;
    }
    setIsOpened(false);
  };

  const onUsernameButtonToggle = () => {
    setIsOpened(prev => !prev);
  };

  return (
    <Dropdown
      onSelect={onUsernameSelect}
      isOpen={isOpened}
      onOpenChange={setIsOpened}
      toggle={toggleRef => (
        <MenuToggle
          ref={toggleRef}
          variant="plain"
          onClick={onUsernameButtonToggle}
          isExpanded={isOpened}
        >
          {username}
        </MenuToggle>
      )}
      popperProps={{ position: 'right' }}
    >
      <DropdownGroup label="Appearance">
        <DropdownList>
          <DropdownItem itemId="theme-selector" key="theme-selector" component="div">
            <ToggleGroup id="theme-toggle" aria-label="Theme toggle group">
              <ToggleGroupItem
                icon={
                  <Icon size="sm">
                    <SunIcon />
                  </Icon>
                }
                aria-label="light theme"
                buttonId="toggle-group-light-theme"
                onChange={() => {
                  if (themePreference !== ThemePreference.LIGHT) {
                    setThemePreference(ThemePreference.LIGHT);
                  }
                }}
                isSelected={themePreference === ThemePreference.LIGHT}
              />
              <ToggleGroupItem
                icon={
                  <Icon size="sm">
                    <MoonIcon />
                  </Icon>
                }
                aria-label="dark theme"
                buttonId="toggle-group-dark-theme"
                onChange={() => {
                  if (themePreference !== ThemePreference.DARK) {
                    setThemePreference(ThemePreference.DARK);
                  }
                }}
                isSelected={themePreference === ThemePreference.DARK}
              />
              <ToggleGroupItem
                icon={
                  <Icon size="sm">
                    <WindowMaximizeIcon />
                  </Icon>
                }
                aria-label="auto theme"
                buttonId="toggle-group-auto-theme"
                onChange={() => {
                  if (themePreference !== ThemePreference.AUTO) {
                    setThemePreference(ThemePreference.AUTO);
                  }
                }}
                isSelected={themePreference === ThemePreference.AUTO}
              />
            </ToggleGroup>
            <Tooltip
              id="tooltip-light-theme"
              content="Light theme"
              position="bottom"
              triggerRef={() =>
                document.getElementById('toggle-group-light-theme') as HTMLButtonElement
              }
            />
            <Tooltip
              id="tooltip-dark-theme"
              content="Dark theme"
              position="bottom"
              triggerRef={() =>
                document.getElementById('toggle-group-dark-theme') as HTMLButtonElement
              }
            />
            <Tooltip
              id="tooltip-auto-theme"
              content="Device-based theme"
              position="bottom"
              triggerRef={() =>
                document.getElementById('toggle-group-auto-theme') as HTMLButtonElement
              }
            />
          </DropdownItem>
        </DropdownList>
      </DropdownGroup>
      <Divider />
      <DropdownGroup label="Actions">
        <DropdownList>
          <DropdownItem key="user-preferences" onClick={() => history.push(ROUTE.USER_PREFERENCES)}>
            User Preferences
          </DropdownItem>
          <DropdownItem key="account_logout" onClick={() => logout()}>
            Logout
          </DropdownItem>
        </DropdownList>
      </DropdownGroup>
    </Dropdown>
  );
};

const mapStateToProps = () => ({});

const connector = connect(mapStateToProps, infrastructureNamespacesActionCreators);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(UserMenuComponent);
