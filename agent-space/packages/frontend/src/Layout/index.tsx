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
  Brand,
  Button,
  ButtonVariant,
  Label,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadLogo,
  MastheadMain,
  MastheadToggle,
  Nav,
  NavItem,
  NavList,
  Page,
  PageSidebar,
  PageSidebarBody,
  PageToggleButton,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { ToggleBarsContext } from '@/contexts/ToggleBars';
import { useBranding } from '@/hooks/useBranding';
import styles from '@/Layout/index.module.css';
import { RecentSandboxes } from '@/Layout/RecentList';
import { HeaderTools } from '@/Layout/Tools';
import { ROUTE } from '@/Routes';
import { dashboardRoute } from '@/services/config';
import { pageTitle, SECTION } from '@/services/pageTitle';
import { selectDashboardUrl, selectIsMockData } from '@/store/Bootstrap';
import { useAppSelector } from '@/store/hooks';

const NAV_ITEMS: { to: string; label: string }[] = [
  { to: ROUTE.GETTING_STARTED, label: SECTION.GETTING_STARTED },
  { to: ROUTE.CREATE, label: SECTION.CREATE },
  { to: ROUTE.SANDBOXES, label: SECTION.SANDBOXES },
];

export type Props = {
  children: React.ReactNode;
  /** Comes from the dashboard theme the app follows; only the logo needs it. */
  isDarkTheme?: boolean;
};

export function Layout({ children, isDarkTheme = false }: Props): React.ReactElement {
  const dashboardUrl = useAppSelector(selectDashboardUrl);
  const isMockData = useAppSelector(selectIsMockData);
  const branding = useBranding(isDarkTheme);
  const location = useLocation();
  const { logoSrc, title } = branding;

  // A page that needs the whole window - the expanded manifest - takes the
  // bars away through the context and puts them back when it is done.
  const [areBarsVisible, setAreBarsVisible] = React.useState(true);
  const toggleBars = React.useMemo(
    () => ({
      hideAll: () => setAreBarsVisible(false),
      showAll: () => setAreBarsVisible(true),
    }),
    [],
  );

  const masthead = (
    <Masthead className={areBarsVisible ? styles.showHeader : styles.hideHeader}>
      <MastheadMain>
        <MastheadToggle>
          <PageToggleButton isHamburgerButton aria-label="Global navigation" />
        </MastheadToggle>
        <MastheadBrand>
          <MastheadLogo>
            <Brand
              src={logoSrc}
              alt={title}
              heights={{ default: '36px' }}
              data-testid="branding-logo"
            />
          </MastheadLogo>
        </MastheadBrand>
      </MastheadMain>
      <MastheadContent>
        <Toolbar id="header-tools" isStatic>
          <ToolbarContent>
            {/* Same group the dashboard masthead uses, so the buttons line up
                the same way on both sides of the two applications. */}
            <ToolbarGroup
              variant="action-group-plain"
              align={{ default: 'alignEnd' }}
              gap={{ default: 'gapNone', md: 'gapMd' }}
            >
              {isMockData && (
                <ToolbarItem>
                  {/* The UI silently falls back to in-memory data when the
                      Sandbox API is unreachable; say so instead of letting a
                      demo be mistaken for a live cluster. */}
                  <Label color="orange" data-testid="mock-mode-label">
                    Demo data
                  </Label>
                </ToolbarItem>
              )}
              <ToolbarItem>
                <Button
                  component="a"
                  href={dashboardUrl}
                  variant={ButtonVariant.secondary}
                  size="sm"
                  icon={<ExternalLinkAltIcon />}
                  iconPosition="end"
                  data-testid="workspaces-button"
                >
                  Workspaces
                </Button>
              </ToolbarItem>
              <HeaderTools
                branding={branding}
                userPreferencesUrl={dashboardRoute(dashboardUrl, '/user-preferences')}
              />
            </ToolbarGroup>
          </ToolbarContent>
        </Toolbar>
      </MastheadContent>
    </Masthead>
  );

  const sidebar = (
    <PageSidebar>
      <PageSidebarBody>
        <Nav aria-label="Agent Space navigation">
          <NavList>
            {NAV_ITEMS.map(item => (
              <NavItem
                key={item.to}
                isActive={location.pathname.startsWith(item.to)}
                data-testid={`nav-${item.to.slice(1)}`}
              >
                {/* The tooltip sits inside the link, not around it: NavItem
                    marks the current section by cloning its own child, and a
                    wrapper would swallow that class. */}
                <NavLink to={item.to}>
                  <Tooltip content={pageTitle(item.label)} position="right">
                    <span>{item.label}</span>
                  </Tooltip>
                </NavLink>
              </NavItem>
            ))}
          </NavList>
          <RecentSandboxes />
        </Nav>
      </PageSidebarBody>
    </PageSidebar>
  );

  return (
    <ToggleBarsContext.Provider value={toggleBars}>
      <Page
        masthead={masthead}
        sidebar={areBarsVisible ? sidebar : undefined}
        isManagedSidebar={areBarsVisible}
      >
        {children}
      </Page>
    </ToggleBarsContext.Provider>
  );
}
