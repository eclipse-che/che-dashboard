/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
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
import { Button, ButtonVariant } from '@patternfly/react-core';
import {
  ActionsColumn,
  IAction,
  TableComposable,
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

  /**
   * Sort by display name
   */
  private sortServices(gitOauth: IGitOauth[]): IGitOauth[] {
    const services = cloneDeep(gitOauth);
    return services.sort((serviceA, serviceB) => {
      return GIT_OAUTH_PROVIDERS[serviceA.name].localeCompare(GIT_OAUTH_PROVIDERS[serviceB.name]);
    });
  }

  private buildHeadRow(): React.ReactElement {
    return (
      <Tr>
        <Th />
        <Th dataLabel="Git Service Name Column Header">Name</Th>
        <Th dataLabel="Git Service Endpoint URL Column Header">Server</Th>
        <Th dataLabel="Git Service Authorization Status Column Header">Authorization</Th>
        <Th dataLabel="Git Service Actions Column Header" />
      </Tr>
    );
  }

  private handleSelectItem(isSelected: boolean, rowIndex: number): void {
    const { sortedGitOauth } = this.state;

    /* c8 ignore start */
    if (rowIndex === -1) {
      // Select all (header row checked)
      const selectedItems = isSelected && sortedGitOauth.length > 0 ? sortedGitOauth : [];
      this.setState({ selectedItems });
      return;
    }
    /* c8 ignore stop */

    // Select single row
    const selectedItem = sortedGitOauth[rowIndex];
    this.setState((prevState: State) => {
      return {
        selectedItems: isSelected
          ? [...prevState.selectedItems, selectedItem]
          : prevState.selectedItems.filter(item => item !== selectedItem),
      };
    });
  }

  private deselectServices(services: IGitOauth[]): void {
    const { selectedItems } = this.state;
    this.setState({
      selectedItems: selectedItems.filter(s => !services.includes(s)),
    });
  }

  private buildBody(): React.ReactNode[] {
    const { sortedGitOauth } = this.state;

    return sortedGitOauth.map((service, rowIndex) => this.buildBodyRow(service, rowIndex));
  }

  private buildBodyRow(service: IGitOauth, rowIndex: number) {
    const { isDisabled, providersWithToken, skipOauthProviders } = this.props;
    const { selectedItems } = this.state;

    const hasWarningMessage =
      this.isRevokeEnabled(service.name) === false && this.hasOauthToken(service.name) === true;

    const canRevoke = this.isRevokeEnabled(service.name) === true;
    const canClear = this.hasSkipOauth(service.name) === true;
    const hasToken = this.hasOauthToken(service.name) === true;
    const rowDisabled = isDisabled || canRevoke === false || hasToken === false;
    const kebabDisabled = (isDisabled || !canRevoke || !hasToken) && !canClear;

    const actionItems = this.buildActionItems(service);

    return (
      <Tr key={service.name} data-testid={service.name}>
        <Td
          dataLabel="Git Service Checkbox"
          select={{
            rowIndex,
            onSelect: (_event, isSelected) => this.handleSelectItem(isSelected, rowIndex),
            isSelected: selectedItems.includes(service),
            disable: rowDisabled,
          }}
        />
        <Td dataLabel="Git Service Name">
          {GIT_OAUTH_PROVIDERS[service.name]}{' '}
          <GitServiceTooltip isVisible={hasWarningMessage} serverURI={service.endpointUrl} />
        </Td>
        <Td dataLabel="Git Service Endpoint URL">
          <Button
            component="a"
            variant={ButtonVariant.link}
            href={service.endpointUrl}
            isInline={true}
            target="_blank"
            rel="noreferer"
          >
            {service.endpointUrl}
          </Button>
        </Td>
        <Td dataLabel="Git Service Authorization">
          <GitServiceStatusIcon
            gitProvider={service.name}
            providersWithToken={providersWithToken}
            skipOauthProviders={skipOauthProviders}
          />
        </Td>
        <Td dataLabel="Git Service Actions" isActionCell={true}>
          <ActionsColumn isDisabled={kebabDisabled} items={actionItems} />
        </Td>
      </Tr>
    );
  }

  private buildActionItems(service: IGitOauth): IAction[] {
    if (this.hasSkipOauth(service.name)) {
      return [
        {
          title: 'Clear',
          onClick: () => this.handleClearService(service),
        },
      ];
    }
    return [
      {
        title: 'Revoke',
        onClick: () => this.handleRevokeService(service),
      },
    ];
  }

  private isRevokeEnabled(providerName: api.GitOauthProvider): boolean {
    return CAN_REVOKE_FROM_DASHBOARD.includes(providerName) === true;
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
    if (serviceToClear != undefined) {
      this.props.onClearService(serviceToClear);
      this.deselectServices([service]);
    }
  }

  private async handleRevokeSelectedServices(): Promise<void> {
    const { selectedItems } = this.state;

    this.props.onRevokeServices(selectedItems);
    this.deselectServices(selectedItems);
  }

  render(): React.ReactNode {
    const { isDisabled } = this.props;
    const { selectedItems } = this.state;

    const headRow = this.buildHeadRow();
    const bodyRows = this.buildBody();

    return (
      <React.Fragment>
        <GitServicesToolbar
          isDisabled={isDisabled}
          selectedItems={selectedItems}
          onRevokeButton={async () => await this.handleRevokeSelectedServices()}
        />

        <TableComposable aria-label="Git Services" variant={TableVariant.compact}>
          <Thead>{headRow}</Thead>
          <Tbody>{bodyRows}</Tbody>
        </TableComposable>
      </React.Fragment>
    );
  }
}
