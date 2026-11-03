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

import { AboutModal } from '@/Layout/Tools/AboutMenu/Modal';
import { BrandingLink } from '@/services/branding';

export type Props = {
  links: BrandingLink[];
  productName: string;
  productVersion?: string;
  username: string;
  logoSrc: string;
};

/** The question-mark menu of the dashboard masthead: help links and About. */
export function AboutMenu({
  links,
  productName,
  productVersion,
  username,
  logoSrc,
}: Props): React.ReactElement {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  return (
    <>
      <Dropdown
        isOpen={isOpen}
        onSelect={() => setIsOpen(false)}
        onOpenChange={setIsOpen}
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            onClick={() => setIsOpen(current => !current)}
            isExpanded={isOpen}
            variant="plain"
            aria-label="About Menu"
            data-testid="about-menu-toggle"
          >
            <QuestionCircleIcon />
          </MenuToggle>
        )}
        popperProps={{ position: 'right' }}
      >
        <DropdownList>
          {links.map(link => (
            <DropdownItem key={link.text} onClick={() => window.open(link.href, '_blank')}>
              {link.text}
            </DropdownItem>
          ))}
          <DropdownItem
            key="about"
            data-testid="about-menu-item"
            onClick={event => {
              event.preventDefault();
              setIsOpen(false);
              // Opening on the next tick lets the dropdown close and release
              // focus first, which the modal would otherwise fight over.
              setTimeout(() => setIsModalOpen(true), 0);
            }}
          >
            About
          </DropdownItem>
        </DropdownList>
      </Dropdown>
      <AboutModal
        isOpen={isModalOpen}
        closeModal={() => setIsModalOpen(false)}
        productName={productName}
        serverVersion={productVersion}
        username={username}
        logo={logoSrc}
      />
    </>
  );
}
