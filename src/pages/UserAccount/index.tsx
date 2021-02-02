/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
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
  Flex, Button, Title, FlexItem, PageSection, Text, TextInput, ButtonVariant, PageSectionVariants, TextVariants,
} from '@patternfly/react-core';
import { History } from 'history';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import Head from '../../components/Head';
import { lazyInject } from '../../inversify.config';
import { KeycloakAuthService } from '../../services/keycloak/auth';
import { AppState } from '../../store';

type Props = {
  history: History;
} & MappedProps;

type State = {
  profileUrl: string;
  firstName: string;
  lastName: string;
  email: string;
  login: string;
}

export class UserAccount extends React.PureComponent<Props, State> {

  @lazyInject(KeycloakAuthService)
  private readonly keycloakAuth: KeycloakAuthService;

  constructor(props: Props) {
    super(props);

    const profile = this.props.userProfile.profile;

    const email = profile ? profile.email : '';
    const login = profile && profile.attributes ? profile.attributes.preferred_username : '';
    const firstName = profile && profile.attributes ? profile.attributes.firstName : '';
    const lastName = profile && profile.attributes ? profile.attributes.lastName : '';
    const profileUrl = KeycloakAuthService.sso ? this.keycloakAuth.getProfileUrl() : '';

    this.state = { login, email, lastName, firstName, profileUrl };
  }

  private onEdit(): void {
    const { profileUrl } = this.state;
    if (profileUrl) {
      window.location.href = profileUrl;
    }
  }

  render(): React.ReactNode {
    const { firstName, lastName, email, login, profileUrl } = this.state;

    return (
      <React.Fragment>
        <Head pageName="User Account" />
        <PageSection variant={PageSectionVariants.light} isFilled={true}>
          <Flex direction={{ default: 'column' }}>
            <FlexItem spacer={{ default: 'spacerSm' }}>
              <Title headingLevel="h1">Account</Title>
            </FlexItem>
            <FlexItem spacer={{ default: 'spacerLg' }}>
              <Text component={TextVariants.p}>
                This is where you can view and edit your account information for Eclipse Che.
              </Text>
            </FlexItem>
          </Flex>
          <Flex direction={{ default: 'column' }} style={{ maxWidth: '550px' }}>
            <Flex direction={{ default: 'column' }}>
              <FlexItem spacer={{ default: 'spacerSm' }}>
                <Title headingLevel="h4" size="md">
                  Login
                </Title>
                <TextInput
                  aria-label="readonly-profile-login"
                  value={login}
                  isDisabled
                />
              </FlexItem>
            </Flex>
            <Flex direction={{ default: 'column' }}>
              <FlexItem spacer={{ default: 'spacerSm' }}>
                <Title headingLevel="h4" size="md">
                  Email
                </Title>
                <TextInput
                  aria-label="readonly-profile-email"
                  value={email}
                  isDisabled
                />
              </FlexItem>
            </Flex>
            <Flex direction={{ default: 'column' }}>
              <FlexItem spacer={{ default: 'spacerSm' }}>
                <Title headingLevel="h4" size="md">
                  First Name
                </Title>
                <TextInput
                  aria-label="readonly-profile-first-name"
                  value={firstName}
                  isDisabled
                />
              </FlexItem>
            </Flex>
            <Flex direction={{ default: 'column' }}>
              <FlexItem spacer={{ default: 'spacerLg' }}>
                <Title headingLevel="h4" size="md">
                  Last Name
                </Title>
                <TextInput
                  aria-label="readonly-profile-last-name"
                  value={lastName}
                  isDisabled
                />
              </FlexItem>
            </Flex>
            <Flex>
              <FlexItem>
                <Button
                  variant={ButtonVariant.primary}
                  onClick={() => this.onEdit()}
                  isDisabled={!profileUrl}
                  aria-label="edit-account-info">
                  Edit
                </Button>
              </FlexItem>
            </Flex>
          </Flex>
        </PageSection>
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  userProfile: state.userProfile,
});

const connector = connect(
  mapStateToProps,
);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(UserAccount);
