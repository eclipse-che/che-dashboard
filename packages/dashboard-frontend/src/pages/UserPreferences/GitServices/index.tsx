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

import { api, helpers } from '@eclipse-che/common';
import { AlertVariant } from '@patternfly/react-core';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import ProgressIndicator from '@/components/Progress';
import { lazyInject } from '@/inversify.config';
import { GIT_OAUTH_PROVIDERS } from '@/pages/UserPreferences/const';
import { GitServicesDeleteModal } from '@/pages/UserPreferences/GitServices/DeleteModal';
import { GitServicesEmptyState } from '@/pages/UserPreferences/GitServices/EmptyState';
import { GitServicesList } from '@/pages/UserPreferences/GitServices/List';
import { GitServicesRevokeModal } from '@/pages/UserPreferences/GitServices/RevokeModal';
import { AppAlerts } from '@/services/alerts/appAlerts';
import { RootState } from '@/store';
import { gitOauthConfigActionCreators, IGitOauth } from '@/store/GitOauthConfig';
import {
  selectGitOauth,
  selectIsLoading,
  selectProvidersWithToken,
  selectSkipOauthProviders,
} from '@/store/GitOauthConfig/selectors';
import { personalAccessTokenActionCreators } from '@/store/PersonalAccessTokens';
import { selectOauthTokens } from '@/store/PersonalAccessTokens/selectors';

type Props = MappedProps;

type State = {
  isModalOpen: boolean;
  selectedServices: IGitOauth[];
  isDeleteModalOpen: boolean;
  deleteService: IGitOauth | undefined;
};

export class GitServices extends React.PureComponent<Props, State> {
  @lazyInject(AppAlerts)
  private readonly appAlerts: AppAlerts;

  constructor(props: Props) {
    super(props);

    this.state = {
      isModalOpen: false,
      selectedServices: [],
      isDeleteModalOpen: false,
      deleteService: undefined,
    };
  }

  public async componentDidMount(): Promise<void> {
    const { isLoading } = this.props;
    if (!isLoading) {
      await Promise.allSettled([this.requestGitServices(), this.props.requestTokens()]);
    }
  }

  private async requestGitServices(): Promise<void> {
    const { requestGitOauthConfig } = this.props;
    try {
      await requestGitOauthConfig();
    } catch (e) {
      this.appAlerts.showAlert({
        key: 'request-git-services-failed',
        variant: AlertVariant.danger,
        title: helpers.errors.getMessage(e),
      });
    }
  }

  private async revokeToken(service: IGitOauth): Promise<void> {
    const { revokeOauth } = this.props;

    try {
      await revokeOauth(service.name);

      this.appAlerts.showAlert({
        key: 'revoke-' + service.name,
        variant: AlertVariant.success,
        title: `Git OAuth "${service.name}" has been revoked`,
      });
    } catch (e) {
      this.appAlerts.showAlert({
        key: 'revoke-' + service.name,
        variant: AlertVariant.danger,
        title: helpers.errors.getMessage(e),
      });
    }
  }

  private async deleteToken(service: IGitOauth): Promise<void> {
    const { deleteOauthToken } = this.props;
    const serviceName = GIT_OAUTH_PROVIDERS[service.name];

    try {
      await deleteOauthToken(service);

      this.appAlerts.showAlert({
        key: 'delete-oauth-token-' + service.name,
        variant: AlertVariant.success,
        title: `OAuth token for "${serviceName}" has been deleted`,
      });
    } catch (e) {
      this.appAlerts.showAlert({
        key: 'delete-oauth-token-' + service.name,
        variant: AlertVariant.danger,
        title: helpers.errors.getMessage(e),
      });
    }
  }

  private async handleDeleteModalConfirm(): Promise<void> {
    const { deleteService } = this.state;

    this.setState({
      isDeleteModalOpen: false,
      deleteService: undefined,
    });

    /* c8 ignore next 3 */
    if (deleteService === undefined) {
      return;
    }

    await this.deleteToken(deleteService);

    await Promise.allSettled([
      // refresh the Git services authentication status
      this.requestGitServices(),

      // refresh the personal access tokens
      this.props.requestTokens(),
    ]);
  }

  private handleDeleteModalClose(): void {
    this.setState({
      isDeleteModalOpen: false,
      deleteService: undefined,
    });
  }

  private handleDeleteService(deleteService: IGitOauth): void {
    this.setState({
      deleteService,
      isDeleteModalOpen: true,
    });
  }

  private async handleModalRevoke(): Promise<void> {
    this.setState({
      isModalOpen: false,
    });

    const { selectedServices } = this.state;

    for (const service of selectedServices) {
      await this.revokeToken(service);
    }

    await Promise.allSettled([
      // refresh the Git services authentication status
      this.requestGitServices(),

      // refresh the personal access tokens
      this.props.requestTokens().catch(),
    ]);

    this.setState({
      selectedServices: [],
    });
  }

  private handleModalClose(): void {
    this.setState({
      isModalOpen: false,
    });
  }

  private handleRevokeServices(selectedServices: IGitOauth[] = []): void {
    this.setState({
      selectedServices,
      isModalOpen: true,
    });
  }

  private handleClearServices(selectedService: api.GitOauthProvider): void {
    this.props.deleteSkipOauth(selectedService);
  }

  render(): React.ReactNode {
    const { gitOauth, isLoading, oauthTokens, providersWithToken, skipOauthProviders } = this.props;
    const { isModalOpen, selectedServices, isDeleteModalOpen, deleteService } = this.state;

    return (
      <React.Fragment>
        <ProgressIndicator isLoading={isLoading} />
        <GitServicesRevokeModal
          isOpen={isModalOpen}
          selectedItems={selectedServices}
          onCancel={() => this.handleModalClose()}
          onRevoke={() => this.handleModalRevoke()}
        />
        <GitServicesDeleteModal
          isOpen={isDeleteModalOpen}
          deleteItem={deleteService}
          onCloseModal={() => this.handleDeleteModalClose()}
          onDelete={() => this.handleDeleteModalConfirm()}
        />
        {gitOauth.length === 0 ? (
          <GitServicesEmptyState text="No Git Services" />
        ) : (
          <GitServicesList
            gitOauth={gitOauth}
            isDisabled={isLoading}
            oauthTokens={oauthTokens}
            providersWithToken={providersWithToken}
            skipOauthProviders={skipOauthProviders}
            onRevokeServices={services => this.handleRevokeServices(services)}
            onClearService={service => this.handleClearServices(service)}
            onDeleteService={service => this.handleDeleteService(service)}
          />
        )}
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  gitOauth: selectGitOauth(state),
  isLoading: selectIsLoading(state),
  oauthTokens: selectOauthTokens(state),
  providersWithToken: selectProvidersWithToken(state),
  skipOauthProviders: selectSkipOauthProviders(state),
});

const connector = connect(mapStateToProps, {
  ...gitOauthConfigActionCreators,
  ...personalAccessTokenActionCreators,
});

type MappedProps = ConnectedProps<typeof connector>;
export default connector(GitServices);
