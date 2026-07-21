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
import { AlertVariant, PageSection } from '@patternfly/react-core';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import ProgressIndicator from '@/components/Progress';
import { lazyInject } from '@/inversify.config';
import ConnectModal from '@/pages/UserPreferences/DeviceAuthTokens/ConnectModal';
import { DeviceAuthTokensDeleteModal } from '@/pages/UserPreferences/DeviceAuthTokens/DeleteModal';
import { DeviceAuthTokensEmptyState } from '@/pages/UserPreferences/DeviceAuthTokens/EmptyState';
import { DeviceAuthTokensList } from '@/pages/UserPreferences/DeviceAuthTokens/List';
import { AppAlerts } from '@/services/alerts/appAlerts';
import { RootState } from '@/store';
import { selectGithubDeviceAuthEnabled } from '@/store/ClusterConfig/selectors';
import {
  deviceAuthTokenActionCreators,
  selectDeviceAuthTokenError,
  selectDeviceAuthTokenIsLoading,
  selectDeviceAuthTokens,
} from '@/store/DeviceAuthToken';
import { selectDefaultNamespace } from '@/store/InfrastructureNamespaces/selectors';

export type Props = MappedProps;

export type State = {
  isDeleteOpen: boolean;
  deletingTokens: api.DeviceAuthToken[];
  isConnectOpen: boolean;
};

class DeviceAuthTokens extends React.PureComponent<Props, State> {
  @lazyInject(AppAlerts)
  private readonly appAlerts: AppAlerts;

  constructor(props: Props) {
    super(props);
    this.state = {
      isDeleteOpen: false,
      deletingTokens: [],
      isConnectOpen: false,
    };
  }

  public async componentDidMount(): Promise<void> {
    if (this.props.isLoading) {
      return;
    }
    try {
      await this.props.requestDeviceAuthTokens();
    } catch (e) {
      this.appAlerts.showAlert({
        key: 'request-device-auth-tokens-failed',
        variant: AlertVariant.danger,
        title: helpers.errors.getMessage(e),
      });
    }
  }

  public componentDidUpdate(prevProps: Props): void {
    const { error } = this.props;
    if (error && error !== prevProps.error) {
      this.appAlerts.showAlert({
        key: 'device-auth-token-error',
        title: helpers.errors.getMessage(error),
        variant: AlertVariant.danger,
      });
    }
  }

  private handleShowDeleteModal(tokens: api.DeviceAuthToken[]): void {
    if (tokens.length === 0) {
      return;
    }
    this.setState({ isDeleteOpen: true, deletingTokens: tokens });
  }

  private handleCloseDeleteModal(): void {
    this.setState({ isDeleteOpen: false, deletingTokens: [] });
  }

  private async handleDelete(tokens: api.DeviceAuthToken[]): Promise<void> {
    this.setState({ isDeleteOpen: false, deletingTokens: [] });
    const results = await Promise.allSettled(
      tokens.map(token => this.props.deleteDeviceAuthToken(token.name)),
    );
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length === 0) {
      this.appAlerts.showAlert({
        key: 'device-auth-token-deleted',
        title:
          tokens.length === 1
            ? 'Device Authentication token deleted successfully.'
            : `${tokens.length} Device Authentication tokens deleted successfully.`,
        variant: AlertVariant.success,
      });
    } else {
      this.appAlerts.showAlert({
        key: 'device-auth-token-delete-failed',
        title: `Failed to delete ${failed.length} of ${tokens.length} token(s).`,
        variant: AlertVariant.danger,
      });
    }
  }

  private handleOpenConnectModal(): void {
    this.setState({ isConnectOpen: true });
  }

  private handleCloseConnectModal(): void {
    this.setState({ isConnectOpen: false });
  }

  private async handleConnectSuccess(): Promise<void> {
    this.setState({ isConnectOpen: false });
    this.appAlerts.showAlert({
      key: 'device-auth-token-connected',
      title: 'GitHub account connected successfully.',
      variant: AlertVariant.success,
    });
    try {
      await this.props.requestDeviceAuthTokens();
    } catch {
      // ignore refresh errors
    }
  }

  public render(): React.ReactElement {
    const { tokens, isLoading, namespace } = this.props;
    const { isDeleteOpen, deletingTokens, isConnectOpen } = this.state;

    const showEmptyState = tokens.length === 0 && !isLoading;
    const showList = tokens.length > 0;

    return (
      <React.Fragment>
        <ProgressIndicator isLoading={isLoading} />
        <DeviceAuthTokensDeleteModal
          isOpen={isDeleteOpen}
          tokens={deletingTokens}
          onCloseModal={() => this.handleCloseDeleteModal()}
          onDelete={tokens => this.handleDelete(tokens)}
        />
        <ConnectModal
          isOpen={isConnectOpen}
          namespace={namespace}
          onCloseModal={() => this.handleCloseConnectModal()}
          onSuccess={() => this.handleConnectSuccess()}
        />
        <PageSection>
          {showEmptyState && (
            <DeviceAuthTokensEmptyState
              onConnect={() => this.handleOpenConnectModal()}
              isConnectEnabled={this.props.githubDeviceAuthEnabled}
            />
          )}
          {showList && (
            <DeviceAuthTokensList
              tokens={tokens}
              isDisabled={isLoading}
              onDeleteTokens={selectedTokens => this.handleShowDeleteModal(selectedTokens)}
            />
          )}
        </PageSection>
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  tokens: selectDeviceAuthTokens(state),
  isLoading: selectDeviceAuthTokenIsLoading(state),
  error: selectDeviceAuthTokenError(state),
  namespace: selectDefaultNamespace(state).name,
  githubDeviceAuthEnabled: selectGithubDeviceAuthEnabled(state),
});

const connector = connect(
  mapStateToProps,
  {
    requestDeviceAuthTokens: deviceAuthTokenActionCreators.requestDeviceAuthTokens,
    deleteDeviceAuthToken: deviceAuthTokenActionCreators.deleteDeviceAuthToken,
  },
  null,
  { forwardRef: true },
);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(DeviceAuthTokens);
