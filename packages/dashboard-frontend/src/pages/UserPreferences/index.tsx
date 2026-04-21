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

import { PageSection, PageSectionVariants, Tab, Tabs, Title } from '@patternfly/react-core';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Location, NavigateFunction } from 'react-router-dom';

import Head from '@/components/Head';
import ContainerRegistries from '@/pages/UserPreferences/ContainerRegistriesTab';
import GitConfig from '@/pages/UserPreferences/GitConfig';
import GitServices from '@/pages/UserPreferences/GitServices';
import PersonalAccessTokens from '@/pages/UserPreferences/PersonalAccessTokens';
import SshKeys from '@/pages/UserPreferences/SshKeys';
import { ROUTE } from '@/Routes';
import { UserPreferencesTab } from '@/services/helpers/types';
import { RootState } from '@/store';
import { gitOauthConfigActionCreators } from '@/store/GitOauthConfig';
import { selectIsLoading } from '@/store/GitOauthConfig/selectors';

export type Props = {
  location: Location;
  navigate: NavigateFunction;
} & MappedProps;

export type State = {
  activeTabKey: UserPreferencesTab;
};

class UserPreferences extends React.PureComponent<Props, State> {
  private readonly tabOrder: UserPreferencesTab[] = [
    UserPreferencesTab.CONTAINER_REGISTRIES,
    UserPreferencesTab.GIT_SERVICES,
    UserPreferencesTab.PERSONAL_ACCESS_TOKENS,
    UserPreferencesTab.GITCONFIG,
    UserPreferencesTab.SSH_KEYS,
  ];

  constructor(props: Props) {
    super(props);

    const activeTabKey = this.getActiveTabKey();

    this.state = {
      activeTabKey,
    };
  }

  private getActiveTabKey(): UserPreferencesTab {
    const { pathname, search } = this.props.location;

    if (search) {
      const searchParam = new URLSearchParams(search);
      const tab = searchParam.get('tab');
      if (
        pathname === ROUTE.USER_PREFERENCES &&
        (tab === UserPreferencesTab.CONTAINER_REGISTRIES ||
          tab === UserPreferencesTab.GITCONFIG ||
          tab === UserPreferencesTab.GIT_SERVICES ||
          tab === UserPreferencesTab.PERSONAL_ACCESS_TOKENS ||
          tab === UserPreferencesTab.SSH_KEYS)
      ) {
        return searchParam.get('tab') as UserPreferencesTab;
      }
    }

    return UserPreferencesTab.CONTAINER_REGISTRIES;
  }

  private handleTabClick = (
    event: React.MouseEvent<HTMLElement, MouseEvent>,
    activeTabKey: string | number,
  ): void => {
    event.stopPropagation();
    this.props.navigate(`${ROUTE.USER_PREFERENCES}?tab=${activeTabKey}`);

    this.setState({
      activeTabKey: activeTabKey as UserPreferencesTab,
    });
  };

  private handleTabKeyDown = (event: React.KeyboardEvent): void => {
    const target = event.target as HTMLElement;
    if (target.getAttribute('role') !== 'tab') {
      return;
    }

    const { activeTabKey } = this.state;
    const currentIndex = this.tabOrder.indexOf(activeTabKey);
    let nextIndex = -1;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % this.tabOrder.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + this.tabOrder.length) % this.tabOrder.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = this.tabOrder.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTabKey = this.tabOrder[nextIndex];
    this.props.navigate(`${ROUTE.USER_PREFERENCES}?tab=${nextTabKey}`);
    this.setState({ activeTabKey: nextTabKey }, () => {
      const tabsContainer = document.getElementById('user-preferences-tabs');
      const buttons = tabsContainer?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      buttons?.[nextIndex]?.focus();
    });
  };

  render(): React.ReactNode {
    const { activeTabKey } = this.state;

    return (
      <React.Fragment>
        <Head pageName="User Preferences" />
        <PageSection variant={PageSectionVariants.default}>
          <Title headingLevel={'h1'}>User Preferences</Title>
        </PageSection>
        <PageSection type={'tabs'}>
          <Tabs
            id="user-preferences-tabs"
            style={{ backgroundColor: 'var(--pf-global--BackgroundColor--100)' }}
            activeKey={activeTabKey}
            onSelect={this.handleTabClick}
            onKeyDown={this.handleTabKeyDown}
            mountOnEnter={true}
            unmountOnExit={true}
          >
            <Tab
              eventKey={UserPreferencesTab.CONTAINER_REGISTRIES}
              title="Container Registries"
              tabIndex={activeTabKey === UserPreferencesTab.CONTAINER_REGISTRIES ? 0 : -1}
            >
              <ContainerRegistries />
            </Tab>
            <Tab
              eventKey={UserPreferencesTab.GIT_SERVICES}
              title="Git Services"
              tabIndex={activeTabKey === UserPreferencesTab.GIT_SERVICES ? 0 : -1}
            >
              <GitServices />
            </Tab>
            <Tab
              eventKey={UserPreferencesTab.PERSONAL_ACCESS_TOKENS}
              title="Personal Access Tokens"
              tabIndex={activeTabKey === UserPreferencesTab.PERSONAL_ACCESS_TOKENS ? 0 : -1}
            >
              <PersonalAccessTokens />
            </Tab>
            <Tab
              eventKey={UserPreferencesTab.GITCONFIG}
              title="Gitconfig"
              tabIndex={activeTabKey === UserPreferencesTab.GITCONFIG ? 0 : -1}
            >
              <GitConfig />
            </Tab>
            <Tab
              eventKey={UserPreferencesTab.SSH_KEYS}
              title="SSH Keys"
              tabIndex={activeTabKey === UserPreferencesTab.SSH_KEYS ? 0 : -1}
            >
              <SshKeys />
            </Tab>
          </Tabs>
        </PageSection>
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  isLoading: selectIsLoading(state),
});

const connector = connect(mapStateToProps, gitOauthConfigActionCreators);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(UserPreferences);
