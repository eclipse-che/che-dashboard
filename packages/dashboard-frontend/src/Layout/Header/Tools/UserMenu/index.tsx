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

import { Dropdown, DropdownItem, DropdownList, MenuToggle } from '@patternfly/react-core';
import { History } from 'history';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { lazyInject } from '@/inversify.config';
import { ROUTE } from '@/Routes';
import { AppAlerts } from '@/services/alerts/appAlerts';
import { BrandingData } from '@/services/bootstrap/branding.constant';
import { infrastructureNamespacesActionCreators } from '@/store/InfrastructureNamespaces';

type Props = MappedProps & {
  branding: BrandingData;
  history: History;
  username: string;
  logout: () => void;
};
type State = {
  isOpened: boolean;
};
export class UserMenu extends React.PureComponent<Props, State> {
  @lazyInject(AppAlerts)
  private readonly appAlerts: AppAlerts;

  constructor(props: Props) {
    super(props);

    this.state = {
      isOpened: false,
    };
  }

  private onUsernameSelect(): void {
    this.setState({
      isOpened: false,
    });
  }

  private onUsernameButtonToggle(): void {
    this.setState(prevState => ({
      isOpened: !prevState.isOpened,
    }));
  }

  private buildUserDropdownItems(): Array<React.ReactElement> {
    return [
      // temporary hidden, https://github.com/eclipse/che/issues/21595
      // <DropdownItem
      //   key="user-account"
      //   onClick={() => this.props.history.push(ROUTE.USER_ACCOUNT)}
      // >
      //   Account
      // </DropdownItem>,
      <DropdownItem
        key="user-preferences"
        onClick={() => this.props.history.push(ROUTE.USER_PREFERENCES)}
      >
        User Preferences
      </DropdownItem>,
      <DropdownItem key="account_logout" onClick={() => this.props.logout()}>
        Logout
      </DropdownItem>,
    ];
  }

  public render(): React.ReactElement {
    const { isOpened: isUsernameDropdownOpen } = this.state;
    const username = this.props.username;

    return (
      <Dropdown
        onSelect={() => this.onUsernameSelect()}
        isOpen={isUsernameDropdownOpen}
        onOpenChange={isOpen => this.setState({ isOpened: isOpen })}
        toggle={toggleRef => (
          <MenuToggle
            ref={toggleRef}
            variant="plain"
            onClick={() => this.onUsernameButtonToggle()}
            isExpanded={isUsernameDropdownOpen}
          >
            {username}
          </MenuToggle>
        )}
        popperProps={{ position: 'right' }}
      >
        <DropdownList>{this.buildUserDropdownItems()}</DropdownList>
      </Dropdown>
    );
  }
}

const mapStateToProps = () => ({});

const connector = connect(mapStateToProps, infrastructureNamespacesActionCreators);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(UserMenu);
