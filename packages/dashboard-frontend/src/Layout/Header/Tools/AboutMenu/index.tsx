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

import { AboutModal } from '@/Layout/Header/Tools/AboutMenu/Modal';
import { BrandingData } from '@/services/bootstrap/branding.constant';
import { buildLogoSrc } from '@/services/helpers/brandingLogo';

type Props = {
  branding: BrandingData;
  username: string;
  dashboardLogo?: { base64data: string; mediatype: string };
};
type State = {
  isLauncherOpen: boolean;
  isModalOpen: boolean;
};

export class AboutMenu extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      isLauncherOpen: false,
      isModalOpen: false,
    };
  }

  private buildDropdownItems(): React.ReactNode[] {
    const branding = this.props.branding;
    const items: React.ReactElement[] = [];
    branding.links?.forEach(link => {
      items.push(
        <DropdownItem key={link.text} onClick={() => window.open(link.href, '_blank')}>
          {link.text}
        </DropdownItem>,
      );
    });

    items.push(
      <DropdownItem key="about" onClick={e => this.showModal(e)}>
        About
      </DropdownItem>,
    );
    return items;
  }

  private onToggle() {
    this.setState({
      isLauncherOpen: !this.state.isLauncherOpen,
    });
  }

  private showModal(e: MouseEvent | React.MouseEvent | React.KeyboardEvent) {
    e.preventDefault();
    this.setState({
      isLauncherOpen: false,
      isModalOpen: true,
    });
  }

  private closeModal() {
    this.setState({
      isLauncherOpen: false,
      isModalOpen: false,
    });
  }

  public render(): React.ReactElement {
    const { username, dashboardLogo } = this.props;
    const { isLauncherOpen, isModalOpen } = this.state;

    const { logoFile, name, productVersion } = this.props.branding;

    const logoSrc = buildLogoSrc(dashboardLogo, logoFile);

    return (
      <>
        <Dropdown
          onSelect={() => this.setState({ isLauncherOpen: false })}
          onOpenChange={isOpen => this.setState({ isLauncherOpen: isOpen })}
          isOpen={isLauncherOpen}
          toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
            <MenuToggle
              ref={toggleRef}
              onClick={() => this.onToggle()}
              isExpanded={isLauncherOpen}
              variant="plain"
              aria-label="About Menu"
            >
              <QuestionCircleIcon />
            </MenuToggle>
          )}
          popperProps={{ position: 'right' }}
        >
          <DropdownList>{this.buildDropdownItems()}</DropdownList>
        </Dropdown>
        <AboutModal
          isOpen={isModalOpen}
          closeModal={() => this.closeModal()}
          username={username}
          logo={logoSrc}
          productName={name}
          serverVersion={productVersion}
        />
      </>
    );
  }
}
