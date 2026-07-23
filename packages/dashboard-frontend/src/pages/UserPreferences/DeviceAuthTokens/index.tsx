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
import { validateDeviceAuthToken } from '@/services/backend-client/deviceAuthTokenApi';
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
  validatedTokens: Record<string, 'valid' | 'invalid' | 'unknown'>;
};

class DeviceAuthTokens extends React.PureComponent<Props, State> {
  @lazyInject(AppAlerts)
  private readonly appAlerts: AppAlerts;

  private _isMounted = false;

  constructor(props: Props) {
    super(props);
    this.state = {
      isDeleteOpen: false,
      deletingTokens: [],
      isConnectOpen: false,
      validatedTokens: {},
    };
  }

  public componentDidMount(): void {
    this._isMounted = true;
    void this._fetchTokens();
  }

  public componentWillUnmount(): void {
    this._isMounted = false;
  }

  private async _fetchTokens(): Promise<void> {
    if (this.props.isLoading) {
      return;
    }
    try {
      await this.props.requestDeviceAuthTokens();
      // Validation is triggered from componentDidUpdate once the updated tokens
      // prop arrives — reading this.props.tokens here would be stale due to
      // React 18 automatic batching deferring the re-render past this point.
    } catch (e) {
      this.appAlerts.showAlert({
        key: 'request-device-auth-tokens-failed',
        variant: AlertVariant.danger,
        title: helpers.errors.getMessage(e),
      });
    }
  }

  public componentDidUpdate(prevProps: Props): void {
    const { error, tokens } = this.props;
    if (error && error !== prevProps.error) {
      this.appAlerts.showAlert({
        key: 'device-auth-token-error',
        title: helpers.errors.getMessage(error),
        variant: AlertVariant.danger,
      });
    }
    if (prevProps.tokens.length === 0 && tokens.length > 0) {
      this.validateTokensInBackground();
    }
  }

  private validateTokensInBackground(): void {
    const { tokens, namespace } = this.props;
    this.setState({ validatedTokens: {} });
    tokens.forEach(token => {
      validateDeviceAuthToken(namespace, token.name)
        .then(valid => {
          if (!this._isMounted) {
            return;
          }
          this.setState(prev => ({
            validatedTokens: { ...prev.validatedTokens, [token.name]: valid },
          }));
        })
        .catch(() => {
          /* ignore */
        });
    });
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

  private async handleConnectSuccess(token: api.DeviceAuthToken): Promise<void> {
    this.setState({ isConnectOpen: false });
    this.appAlerts.showAlert({
      key: 'device-auth-token-connected',
      title: 'GitHub account connected successfully.',
      variant: AlertVariant.success,
    });
    // Kick off background validation for the new token immediately,
    // so the status icon appears without waiting for the list re-fetch.
    const { namespace } = this.props;
    validateDeviceAuthToken(namespace, token.name)
      .then(valid => {
        if (this._isMounted) {
          this.setState(prev => ({
            validatedTokens: { ...prev.validatedTokens, [token.name]: valid },
          }));
        }
      })
      .catch(() => {
        /* ignore */
      });
    try {
      await this.props.requestDeviceAuthTokens();
    } catch (e) {
      this.appAlerts.showAlert({
        key: 'device-auth-token-refresh-failed',
        title: 'Token added but the list could not be refreshed. Try navigating away and back.',
        variant: AlertVariant.warning,
      });
    }
  }

  public render(): React.ReactElement {
    const { tokens, isLoading, namespace } = this.props;
    const { isDeleteOpen, deletingTokens, isConnectOpen, validatedTokens = {} } = this.state;

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
          onSuccess={token => this.handleConnectSuccess(token)}
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
              tokens={tokens.map(t => ({
                ...t,
                ...(validatedTokens[t.name] !== undefined
                  ? { valid: validatedTokens[t.name] }
                  : {}),
              }))}
              isDisabled={isLoading}
              isConnectEnabled={this.props.githubDeviceAuthEnabled}
              onDeleteTokens={selectedTokens => this.handleShowDeleteModal(selectedTokens)}
              onConnect={() => this.handleOpenConnectModal()}
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
