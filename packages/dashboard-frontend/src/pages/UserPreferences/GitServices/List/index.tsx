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

import { api } from '@eclipse-che/common';
import {
  Button,
  ButtonVariant,
  DataList,
  DataListAction,
  DataListCell,
  DataListCheck,
  DataListControl,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
} from '@patternfly/react-core';
import cloneDeep from 'lodash/cloneDeep';
import React from 'react';

import { GIT_OAUTH_PROVIDERS } from '@/pages/UserPreferences/const';
import styles from '@/pages/UserPreferences/GitServices/List/index.module.css';
import { GitServiceStatusIcon } from '@/pages/UserPreferences/GitServices/List/StatusIcon';
import { GitServiceTooltip } from '@/pages/UserPreferences/GitServices/List/Tooltip';
import { GitServicesToolbar } from '@/pages/UserPreferences/GitServices/Toolbar';
import { IGitOauth } from '@/store/GitOauthConfig';

export const CAN_REVOKE_FROM_DASHBOARD: ReadonlyArray<api.GitOauthProvider> = [
  'github',
  'github_2',
  'gitlab',
  'gitlab_2',
];

export type Props = {
  isDisabled: boolean;
  gitOauth: IGitOauth[];
  providersWithToken: api.GitOauthProvider[];
  skipOauthProviders: api.GitOauthProvider[];
  onRevokeServices: (services: IGitOauth[]) => void;
  onClearService: (service: api.GitOauthProvider) => void;
};

type State = {
  selectedItems: IGitOauth[];
  sortedGitOauth: IGitOauth[];
};

export class GitServicesList extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      selectedItems: [],
      sortedGitOauth: this.sortServices(props.gitOauth),
    };
  }

  private sortServices(gitOauth: IGitOauth[]): IGitOauth[] {
    const services = cloneDeep(gitOauth);
    return services.sort((serviceA, serviceB) =>
      GIT_OAUTH_PROVIDERS[serviceA.name].localeCompare(GIT_OAUTH_PROVIDERS[serviceB.name]),
    );
  }

  private handleSelectItem(isSelected: boolean, service: IGitOauth): void {
    this.setState((prevState: State) => ({
      selectedItems: isSelected
        ? [...prevState.selectedItems, service]
        : prevState.selectedItems.filter(item => item !== service),
    }));
  }

  private deselectServices(services: IGitOauth[]): void {
    this.setState(prev => ({
      selectedItems: prev.selectedItems.filter(s => !services.includes(s)),
    }));
  }

  private isRevokeEnabled(providerName: api.GitOauthProvider): boolean {
    return CAN_REVOKE_FROM_DASHBOARD.includes(providerName);
  }

  private hasSkipOauth(providerName: api.GitOauthProvider): boolean {
    return this.props.skipOauthProviders.includes(providerName);
  }

  private hasOauthToken(providerName: api.GitOauthProvider): boolean {
    return this.props.providersWithToken.includes(providerName);
  }

  private handleRevokeService(service: IGitOauth): void {
    this.props.onRevokeServices([service]);
    this.deselectServices([service]);
  }

  private handleClearService(service: IGitOauth): void {
    const serviceToClear = this.props.skipOauthProviders.find(s => s === service.name);
    if (serviceToClear !== undefined) {
      this.props.onClearService(serviceToClear);
      this.deselectServices([service]);
    }
  }

  private async handleRevokeSelectedServices(): Promise<void> {
    const { selectedItems } = this.state;
    this.props.onRevokeServices(selectedItems);
    this.deselectServices(selectedItems);
  }

  private buildItem(service: IGitOauth, rowIndex: number): React.ReactElement {
    const { isDisabled, providersWithToken, skipOauthProviders } = this.props;
    const { selectedItems } = this.state;

    const hasWarningMessage =
      !this.isRevokeEnabled(service.name) && this.hasOauthToken(service.name);
    const canRevoke = this.isRevokeEnabled(service.name);
    const canClear = this.hasSkipOauth(service.name);
    const hasToken = this.hasOauthToken(service.name);
    const checkDisabled = isDisabled || !canRevoke || !hasToken;
    const actionDisabled = (isDisabled || !canRevoke || !hasToken) && !canClear;
    const actionLabel = canClear ? 'Clear' : 'Revoke';
    const handleAction = canClear
      ? () => this.handleClearService(service)
      : () => this.handleRevokeService(service);

    const nameId = `git-service-name-${service.name}`;
    const actionId = `git-service-action-${service.name}`;

    return (
      <DataListItem key={service.name} aria-labelledby={nameId} data-testid={service.name}>
        <DataListItemRow>
          <DataListControl>
            <DataListCheck
              aria-labelledby={nameId}
              name={`checkrow${rowIndex}`}
              isChecked={selectedItems.includes(service)}
              isDisabled={checkDisabled}
              onChange={(_event, checked) => this.handleSelectItem(checked, service)}
            />
          </DataListControl>
          <DataListItemCells
            dataListCells={[
              <DataListCell key="name" className={styles.nameCell}>
                <span id={nameId} className={styles.serviceName}>
                  {GIT_OAUTH_PROVIDERS[service.name]}
                </span>
                <GitServiceTooltip isVisible={hasWarningMessage} serverURI={service.endpointUrl} />
              </DataListCell>,
              <DataListCell key="server" className={styles.serverCell}>
                <Button
                  component="a"
                  variant={ButtonVariant.link}
                  href={service.endpointUrl}
                  isInline
                  target="_blank"
                  rel="noreferer"
                >
                  {service.endpointUrl}
                </Button>
              </DataListCell>,
              <DataListCell key="auth" className={styles.authCell}>
                <GitServiceStatusIcon
                  gitProvider={service.name}
                  providersWithToken={providersWithToken}
                  skipOauthProviders={skipOauthProviders}
                />
              </DataListCell>,
            ]}
          />
          <DataListAction
            id={actionId}
            aria-labelledby={`${nameId} ${actionId}`}
            aria-label="Actions"
          >
            <Button
              variant={ButtonVariant.secondary}
              isDisabled={actionDisabled}
              onClick={handleAction}
              size="sm"
            >
              {actionLabel}
            </Button>
          </DataListAction>
        </DataListItemRow>
      </DataListItem>
    );
  }

  render(): React.ReactNode {
    const { isDisabled } = this.props;
    const { selectedItems, sortedGitOauth } = this.state;

    return (
      <React.Fragment>
        <GitServicesToolbar
          isDisabled={isDisabled}
          selectedItems={selectedItems}
          onRevokeButton={async () => await this.handleRevokeSelectedServices()}
        />
        <DataList aria-label="Git Services">
          {sortedGitOauth.map((service, rowIndex) => this.buildItem(service, rowIndex))}
        </DataList>
      </React.Fragment>
    );
  }
}
