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
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { QuestionCircleIcon } from '@patternfly/react-icons';
import React from 'react';

import { useTheme } from '@/contexts/ThemeContext';
import { AboutModal } from '@/Layout/Header/Tools/AboutMenu/Modal';
import { BrandingData } from '@/services/bootstrap/branding.constant';
import { buildLogoSrc } from '@/services/helpers/brandingLogo';

type Props = {
  branding: BrandingData;
  username: string;
  dashboardLogo?: { base64data: string; mediatype: string };
};

export const AboutMenu: React.FC<Props> = ({ branding, username, dashboardLogo }) => {
  const [isLauncherOpen, setIsLauncherOpen] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const { isDarkTheme } = useTheme();

  const buildDropdownItems = React.useCallback(() => {
    const items: React.ReactElement[] = [];
    branding.links?.forEach(link => {
      items.push(
        <DropdownItem key={link.text} onClick={() => window.open(link.href, '_blank')}>
          {link.text}
        </DropdownItem>,
      );
    });

    items.push(
      <DropdownItem
        key="about"
        onClick={e => {
          e.preventDefault();
          setIsLauncherOpen(false);
          setIsModalOpen(true);
        }}
      >
        About
      </DropdownItem>,
    );
    return items;
  }, [branding.links]);

  const { logoFile, name, productVersion } = branding;

  // Use light theme logo for light mode, default logo for dark mode
  const themeAwareLogoFile = React.useMemo(() => {
    if (!logoFile || isDarkTheme) {
      return logoFile;
    }
    // Replace the assets path prefix if present
    if (logoFile.includes('./assets/branding/')) {
      return logoFile.replace('./assets/branding/', './assets/branding/lightTheme/');
    }
    // Fallback: prepend lightTheme/ if no prefix found
    return `lightTheme/${logoFile}`;
  }, [logoFile, isDarkTheme]);

  const logoSrc = buildLogoSrc(dashboardLogo, themeAwareLogoFile);

  return (
    <>
      <Dropdown
        onSelect={() => setIsLauncherOpen(false)}
        onOpenChange={isOpen => setIsLauncherOpen(isOpen)}
        isOpen={isLauncherOpen}
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            onClick={() => setIsLauncherOpen(!isLauncherOpen)}
            isExpanded={isLauncherOpen}
            variant="plain"
            aria-label="About Menu"
          >
            <QuestionCircleIcon />
          </MenuToggle>
        )}
        popperProps={{ position: 'right' }}
      >
        <DropdownList>{buildDropdownItems()}</DropdownList>
      </Dropdown>
      <AboutModal
        isOpen={isModalOpen}
        closeModal={() => {
          setIsLauncherOpen(false);
          setIsModalOpen(false);
        }}
        username={username}
        logo={logoSrc}
        productName={name}
        serverVersion={productVersion}
      />
    </>
  );
};
