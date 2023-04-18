/*
 * Copyright (c) 2018-2023 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { api } from '@eclipse-che/common';
import { Form } from '@patternfly/react-core';
import React from 'react';
import { DEFAULT_PROVIDER } from '../../../const';
import { EditTokenProps } from '../../types';
import { GitProviderEndpoint } from './GitProviderEndpoint';
import { GitProviderOrganization } from './GitProviderOrganization';
import { GitProviderSelector } from './GitProviderSelector';
import { GitProviderUsername } from './GitProviderUsername';
import { TokenData } from './TokenData';
import { TokenName } from './TokenName';

export type Props = EditTokenProps & {
  cheUserId: string;
  onChange: (token: api.PersonalAccessToken, isValid: boolean) => void;
};
export type State = {
  gitProvider: api.GitOauthProvider;
  gitProviderEndpoint: string;
  gitProviderEndpointIsValid: boolean;
  gitProviderUsername: string;
  gitProviderUsernameIsValid: boolean;
  gitProviderOrganization: string;
  gitProviderOrganizationIsValid: boolean;
  tokenName: string;
  tokenNameIsValid: boolean;
  tokenData: string;
  tokenDataIsValid: boolean;
};

export class AddEditModalForm extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    const { gitProviderEndpoint, gitProvider, gitProviderUsername, tokenName, tokenData } =
      props.token || {
        gitProviderEndpoint: '',
        gitProvider: DEFAULT_PROVIDER,
        gitProviderUsername: '',
        tokenName: '',
        tokenData: '',
      };

    const gitProviderOrganization =
      props.token?.gitProvider === 'azure-devops' ? props.token.gitProviderOrganization : '';

    const isValid = this.props.isEdit;

    this.state = {
      gitProvider,
      gitProviderEndpoint,
      gitProviderEndpointIsValid: isValid,
      gitProviderUsername,
      gitProviderUsernameIsValid: isValid,
      gitProviderOrganization,
      gitProviderOrganizationIsValid: isValid,
      tokenName,
      tokenNameIsValid: isValid,
      tokenData,
      tokenDataIsValid: isValid,
    };
  }

  private updateChangeToken(partialState: Partial<State>): void {
    const { cheUserId } = this.props;
    const nextState = { ...this.state, ...partialState };
    this.setState(nextState);

    const {
      gitProviderEndpoint,
      gitProviderEndpointIsValid,
      gitProvider,
      gitProviderOrganization,
      gitProviderOrganizationIsValid,
      gitProviderUsername,
      gitProviderUsernameIsValid,
      tokenName,
      tokenNameIsValid,
      tokenData,
      tokenDataIsValid,
    } = nextState;

    if (gitProvider === 'azure-devops') {
      const token: api.PersonalAccessToken = {
        cheUserId,
        gitProviderEndpoint,
        gitProviderUsername,
        gitProvider,
        gitProviderOrganization,
        tokenName,
        tokenData,
      };
      const isValid =
        gitProviderEndpointIsValid &&
        gitProviderUsernameIsValid &&
        gitProviderOrganizationIsValid &&
        tokenNameIsValid &&
        tokenDataIsValid;
      this.props.onChange(token, isValid);
    } else {
      const token: api.PersonalAccessToken = {
        cheUserId,
        gitProviderEndpoint,
        gitProviderUsername,
        gitProvider,
        tokenName,
        tokenData,
      };
      const isValid =
        gitProviderEndpointIsValid &&
        gitProviderUsernameIsValid &&
        tokenNameIsValid &&
        tokenDataIsValid;
      this.props.onChange(token, isValid);
    }
  }

  private handleChangeGitProvider(gitProvider: api.GitOauthProvider): void {
    this.updateChangeToken({
      gitProvider,
    });
  }

  private handleChangeGitProviderEndpoint(
    gitProviderEndpoint: string,
    gitProviderEndpointIsValid: boolean,
  ): void {
    this.updateChangeToken({
      gitProviderEndpoint,
      gitProviderEndpointIsValid,
    });
  }

  private handleChangeGitProviderUsername(
    gitProviderUsername: string,
    gitProviderUsernameIsValid: boolean,
  ): void {
    this.updateChangeToken({
      gitProviderUsername,
      gitProviderUsernameIsValid,
    });
  }

  private handleChangeGitProviderOrganization(
    gitProviderOrganization: string,
    gitProviderOrganizationIsValid: boolean,
  ): void {
    this.updateChangeToken({
      gitProviderOrganization,
      gitProviderOrganizationIsValid,
    });
  }

  private handleChangeTokenName(tokenName: string, tokenNameIsValid: boolean): void {
    this.updateChangeToken({
      tokenName,
      tokenNameIsValid,
    });
  }

  private handleChangeTokenData(tokenData: string, tokenDataIsValid: boolean): void {
    const { isEdit } = this.props;
    if (isEdit && tokenDataIsValid === false) {
      tokenData = this.props.token.tokenData;
      tokenDataIsValid = true;
    }

    this.updateChangeToken({
      tokenData,
      tokenDataIsValid,
    });
  }

  public render(): React.ReactElement {
    const { isEdit } = this.props;
    const {
      gitProvider,
      gitProviderEndpoint,
      gitProviderOrganization,
      gitProviderUsername,
      tokenData,
      tokenName,
    } = this.state;

    return (
      <Form onSubmit={e => e.preventDefault()}>
        <TokenName
          isEdit={isEdit}
          tokenName={tokenName}
          onChange={(...args) => this.handleChangeTokenName(...args)}
        />
        <GitProviderSelector
          provider={gitProvider}
          onSelect={(...args) => this.handleChangeGitProvider(...args)}
        />
        <GitProviderEndpoint
          providerEndpoint={gitProviderEndpoint}
          onChange={(...args) => this.handleChangeGitProviderEndpoint(...args)}
        />
        <GitProviderUsername
          providerUsername={gitProviderUsername}
          onChange={(...args) => this.handleChangeGitProviderUsername(...args)}
        />
        {gitProvider === 'azure-devops' && (
          <GitProviderOrganization
            providerOrganization={gitProviderOrganization}
            onChange={(...args) => this.handleChangeGitProviderOrganization(...args)}
          />
        )}
        <TokenData
          isEdit={isEdit}
          tokenData={tokenData}
          onChange={(...args) => this.handleChangeTokenData(...args)}
        />
      </Form>
    );
  }
}
