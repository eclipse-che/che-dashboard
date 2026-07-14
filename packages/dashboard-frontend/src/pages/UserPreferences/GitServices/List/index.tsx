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
import { Button, ButtonVariant, PageSection } from '@patternfly/react-core';
import {
  ActionsColumn,
  IAction,
  Table,
  TableVariant,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@patternfly/react-table';
import cloneDeep from 'lodash/cloneDeep';
import React from 'react';

import { GIT_OAUTH_PROVIDERS } from '@/pages/UserPreferences/const';
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

const COLUMN_NAMES = {
  provider: 'Provider',
  endpoint: 'Endpoint',
  status: 'Status',
};

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

  private handleSelectAll(
    _event: React.FormEvent<HTMLInputElement>,
    isSelected: boolean,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ...rest: unknown[]
  ): void {
    const { sortedGitOauth } = this.state;
    const selectableServices = sortedGitOauth.filter(s => this.isCheckEnabled(s));
    this.setState({ selectedItems: isSelected ? selectableServices : [] });
  }

  private handleSelectItem(
    _event: React.FormEvent<HTMLInputElement>,
    isSelected: boolean,
    rowIndex: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ...rest: unknown[]
  ): void {
    const service = this.state.sortedGitOauth[rowIndex];
    this.setState(prev => ({
      selectedItems: isSelected
        ? [...prev.selectedItems, service]
        : prev.selectedItems.filter(item => item !== service),
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

  private isCheckEnabled(service: IGitOauth): boolean {
    const { isDisabled } = this.props;
    return !isDisabled && this.isRevokeEnabled(service.name) && this.hasOauthToken(service.name);
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

  private buildHeadRow(): React.ReactElement {
    const { isDisabled } = this.props;
    const { selectedItems, sortedGitOauth } = this.state;

    const selectableServices = sortedGitOauth.filter(s => this.isCheckEnabled(s));
    const areAllSelected =
      selectableServices.length > 0 && selectedItems.length === selectableServices.length;

    return (
      <Tr>
        <Th
          select={{
            onSelect: (...args) => this.handleSelectAll(...args),
            isSelected: areAllSelected,
            isDisabled: isDisabled || selectableServices.length === 0,
          }}
        />
        <Th style={{ minWidth: '8rem' }}>{COLUMN_NAMES.provider}</Th>
        <Th>{COLUMN_NAMES.endpoint}</Th>
        <Th>{COLUMN_NAMES.status}</Th>
        <Td />
      </Tr>
    );
  }

  private buildRowAction(service: IGitOauth): IAction[] {
    const canRevoke = this.isRevokeEnabled(service.name);
    const canClear = this.hasSkipOauth(service.name);
    const hasToken = this.hasOauthToken(service.name);
    const { isDisabled } = this.props;
    const actionDisabled = (isDisabled || !canRevoke || !hasToken) && !canClear;
    const actionLabel = canClear ? 'Clear' : 'Revoke';
    const handleAction = canClear
      ? () => this.handleClearService(service)
      : () => this.handleRevokeService(service);

    return [{ title: actionLabel, onClick: handleAction, isDisabled: actionDisabled }];
  }

  private buildBodyRows(): React.ReactElement[] {
    const { isDisabled, providersWithToken, skipOauthProviders } = this.props;
    const { selectedItems, sortedGitOauth } = this.state;

    return sortedGitOauth.map((service, rowIndex) => {
      const hasWarningMessage =
        !this.isRevokeEnabled(service.name) && this.hasOauthToken(service.name);
      const canRevoke = this.isRevokeEnabled(service.name);
      const canClear = this.hasSkipOauth(service.name);
      const hasToken = this.hasOauthToken(service.name);
      const checkDisabled = isDisabled || !canRevoke || !hasToken;

      return (
        <Tr key={service.name} data-testid={service.name}>
          <Td
            select={{
              rowIndex,
              onSelect: (...args) => this.handleSelectItem(...args),
              isSelected: selectedItems.includes(service),
              isDisabled: checkDisabled,
            }}
          />
          <Td dataLabel={COLUMN_NAMES.provider}>
            <strong>{GIT_OAUTH_PROVIDERS[service.name]}</strong>
            <GitServiceTooltip isVisible={hasWarningMessage} serverURI={service.endpointUrl} />
          </Td>
          <Td
            dataLabel={COLUMN_NAMES.endpoint}
            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
          >
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
          </Td>
          <Td dataLabel={COLUMN_NAMES.status}>
            <GitServiceStatusIcon
              gitProvider={service.name}
              providersWithToken={providersWithToken}
              skipOauthProviders={skipOauthProviders}
            />
          </Td>
          <Td isActionCell>
            <ActionsColumn
              isDisabled={(isDisabled || !canRevoke || !hasToken) && !canClear}
              items={this.buildRowAction(service)}
            />
          </Td>
        </Tr>
      );
    });
  }

  render(): React.ReactNode {
    const { isDisabled } = this.props;
    const { selectedItems } = this.state;

    return (
      <PageSection>
        <GitServicesToolbar
          isDisabled={isDisabled}
          selectedItems={selectedItems}
          onRevokeButton={async () => await this.handleRevokeSelectedServices()}
        />
        <Table aria-label="Git Services" variant={TableVariant.compact}>
          <Thead>{this.buildHeadRow()}</Thead>
          <Tbody>{this.buildBodyRows()}</Tbody>
        </Table>
      </PageSection>
    );
  }
}
