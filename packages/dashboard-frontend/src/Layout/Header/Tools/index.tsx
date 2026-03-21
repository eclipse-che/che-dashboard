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

import { Avatar, Toolbar, ToolbarContent, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import gravatarUrl from 'gravatar-url';
import { History } from 'history';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { AboutMenu } from '@/Layout/Header/Tools/AboutMenu';
import { ApplicationsMenu } from '@/Layout/Header/Tools/ApplicationsMenu';
import UserMenu from '@/Layout/Header/Tools/UserMenu';
import { RootState } from '@/store';
import { selectBranding } from '@/store/Branding/selectors';
import { selectApplications } from '@/store/ClusterInfo/selectors';
import { selectDashboardLogo } from '@/store/ServerConfig/selectors';
import { selectUserProfile } from '@/store/User/Profile/selectors';

type Props = MappedProps & {
  history: History;
  logout: () => void;
};
export class HeaderTools extends React.PureComponent<Props> {
  constructor(props: Props) {
    super(props);
  }

  public render(): React.ReactElement {
    const { applications, userProfile } = this.props;

    const { email, username } = userProfile;
    const imageUrl = email ? gravatarUrl(email, { default: 'retro' }) : '';
    const isUserAuthenticated = !!email;

    return (
      <Toolbar id="header-tools" isStatic>
        <ToolbarContent>
          <ToolbarGroup
            variant="action-group-plain"
            align={{ default: 'alignEnd' }}
            gap={{ default: 'gapNone', md: 'gapMd' }}
          >
            {applications.length !== 0 && <ApplicationsMenu applications={applications} />}
            <ToolbarItem>
              <AboutMenu
                branding={this.props.branding}
                dashboardLogo={this.props.dashboardLogo}
                username={username}
              />
            </ToolbarItem>
            {isUserAuthenticated && (
              <ToolbarItem>
                <UserMenu
                  branding={this.props.branding}
                  history={this.props.history}
                  username={username}
                  logout={() => this.props.logout()}
                />
              </ToolbarItem>
            )}
          </ToolbarGroup>
          {isUserAuthenticated && (
            <ToolbarItem>
              <Avatar src={imageUrl} alt="Avatar image" size="md" />
            </ToolbarItem>
          )}
        </ToolbarContent>
      </Toolbar>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  userProfile: selectUserProfile(state),
  branding: selectBranding(state),
  dashboardLogo: selectDashboardLogo(state),
  applications: selectApplications(state),
});

const connector = connect(mapStateToProps);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(HeaderTools);
