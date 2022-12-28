/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
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
  AlertVariant,
  Button,
  ButtonVariant,
  PageSection,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { Table, TableBody, TableHeader } from '@patternfly/react-table';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import ProgressIndicator from '../../../components/Progress';
import { lazyInject } from '../../../inversify.config';
import { AppAlerts } from '../../../services/alerts/appAlerts';
import { AlertItem } from '../../../services/helpers/types';
import { AppState } from '../../../store';
import { selectIsLoading, selectGitOauth } from '../../../store/GitOauthConfig/selectors';
import EmptyState from './EmptyState';
import RevokeGitServicesModal from './Modals/RevokeGitServicesModal';
import { api, helpers } from '@eclipse-che/common';
import * as GitOauthConfig from '../../../store/GitOauthConfig';
import { isEqual } from 'lodash';

export const providersMap = {
  github: 'GitHub',
  gitlab: 'GitLab',
  bitbucket: 'Bitbucket',
};

type Props = MappedProps;

type State = {
  selectedItems: api.GitOauthProvider[];
  gitOauth: { name: api.GitOauthProvider; endpointUrl: string }[];
  currentGitOauth: api.GitOauthProvider | undefined;
  currentGitOauthIndex: number;
  isRevokeModalOpen: boolean;
  isEditModalOpen: boolean;
};

export class GitServicesTab extends React.PureComponent<Props, State> {
  @lazyInject(AppAlerts)
  private readonly appAlerts: AppAlerts;

  constructor(props: Props) {
    super(props);

    const gitOauth = this.props.gitOauth;

    this.state = {
      gitOauth,
      currentGitOauth: undefined,
      selectedItems: [],
      currentGitOauthIndex: -1,
      isEditModalOpen: false,
      isRevokeModalOpen: false,
    };
  }

  private onChangeSelection(isSelected: boolean, rowIndex: number) {
    const { gitOauth } = this.state;
    if (rowIndex === -1) {
      const selectedItems = isSelected ? gitOauth.map(val => val.name) : [];
      this.setState({ selectedItems });
    } else {
      const selectedItem = gitOauth[rowIndex]?.name;
      this.setState((prevState: State) => {
        return {
          selectedItems: isSelected
            ? [...prevState.selectedItems, selectedItem]
            : prevState.selectedItems.filter(item => item !== selectedItem),
        };
      });
    }
  }

  public async componentDidMount(): Promise<void> {
    const { isLoading, requestGitOauthConfig } = this.props;
    if (!isLoading) {
      requestGitOauthConfig();
    }
  }

  public componentDidUpdate(prevProps: Props, prevState: State): void {
    const gitOauth = this.props.gitOauth;
    if (!isEqual(prevProps.gitOauth, gitOauth)) {
      const selectedItems: api.GitOauthProvider[] = [];
      this.state.selectedItems.forEach(selectedItem => {
        if (gitOauth.map(val => val.name).indexOf(selectedItem) !== -1) {
          selectedItems.push(selectedItem);
        }
      });
      this.setState({ gitOauth, selectedItems });
    }
    if (prevState.currentGitOauthIndex !== this.state.currentGitOauthIndex) {
      const currentGitOauth = gitOauth[this.state.currentGitOauthIndex]?.name;
      this.setState({ currentGitOauth });
    }
  }

  private showAlert(alert: AlertItem): void {
    this.appAlerts.showAlert(alert);
  }

  private buildGitOauthRow(gitOauth: api.GitOauthProvider, server: string): React.ReactNode[] {
    const oauthRow: React.ReactNode[] = [<span key={gitOauth}>{providersMap[gitOauth]}</span>];

    if (/^http[s]?:\/\/.*/.test(server)) {
      oauthRow.push(
        <span key={server}>
          <a href={server} target="_blank" rel="noreferrer">
            {server}
          </a>
        </span>,
      );
    } else {
      oauthRow.push(<span key={server}>{server}</span>);
    }

    return oauthRow;
  }

  private showOnRevokeGitOauthModal(rowIndex: number): void {
    this.setState({ currentGitOauthIndex: rowIndex, isRevokeModalOpen: true });
  }

  private async revokeOauth(gitOauth: api.GitOauthProvider): Promise<void> {
    try {
      await this.props.revokeOauth(gitOauth);
      this.showAlert({
        key: 'revoke-github',
        variant: AlertVariant.success,
        title: `Git oauth '${gitOauth}' successfully deleted.`,
      });
    } catch (e) {
      this.showAlert({
        key: 'revoke-fail',
        variant: AlertVariant.danger,
        title: helpers.errors.getMessage(e),
      });
    }
  }

  private async handleRevoke(gitOauth?: api.GitOauthProvider): Promise<void> {
    this.setState({ isRevokeModalOpen: false, currentGitOauthIndex: -1 });
    if (gitOauth === undefined) {
      for (const selectedItem of this.state.selectedItems) {
        await this.revokeOauth(selectedItem);
      }
      this.setState({ selectedItems: [] });
    } else {
      await this.revokeOauth(gitOauth);
    }
  }

  private setRevokeModalStatus(isRevokeModalOpen: boolean): void {
    if (this.state.isRevokeModalOpen === isRevokeModalOpen) {
      return;
    }
    this.setState({ isRevokeModalOpen });
  }

  private handleModalShow(): void {
    this.setState({ currentGitOauthIndex: -1, isRevokeModalOpen: true });
  }

  render(): React.ReactNode {
    const { isLoading } = this.props;
    const { isRevokeModalOpen, currentGitOauth, selectedItems } = this.state;
    const columns = ['Name', 'Server'];
    const rows =
      this.state.gitOauth.map(provider => ({
        cells: this.buildGitOauthRow(provider.name, provider.endpointUrl),
        selected: selectedItems.includes(provider.name),
      })) || [];
    const actions = [
      {
        title: 'Revoke',
        onClick: (event, rowIndex) => this.showOnRevokeGitOauthModal(rowIndex),
      },
    ];

    return (
      <React.Fragment>
        <ProgressIndicator isLoading={isLoading} />
        <PageSection>
          {rows.length === 0 ? (
            <EmptyState text="No Git Services" />
          ) : (
            <React.Fragment>
              <RevokeGitServicesModal
                selectedItems={selectedItems}
                onCancel={() => this.setRevokeModalStatus(false)}
                onRevoke={() => this.handleRevoke(currentGitOauth)}
                isOpen={isRevokeModalOpen}
                gitOauth={currentGitOauth}
              />
              <Toolbar id="git-services-list-toolbar" className="pf-m-page-insets">
                <ToolbarContent>
                  <ToolbarItem>
                    <Button
                      variant={ButtonVariant.danger}
                      isDisabled={this.state.selectedItems.length === 0}
                      data-testid="bulk-revoke-button"
                      onClick={() => this.handleModalShow()}
                    >
                      Revoke
                    </Button>
                  </ToolbarItem>
                </ToolbarContent>
              </Toolbar>
              <Table
                cells={columns}
                actions={actions}
                rows={rows}
                onSelect={(event, isSelected, rowIndex) => {
                  this.onChangeSelection(isSelected, rowIndex);
                }}
                canSelectAll={true}
                aria-label="Git services"
                variant="compact"
              >
                <TableHeader />
                <TableBody />
              </Table>
            </React.Fragment>
          )}
        </PageSection>
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  gitOauth: selectGitOauth(state),
  isLoading: selectIsLoading(state),
});

const connector = connect(mapStateToProps, GitOauthConfig.actionCreators);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(GitServicesTab);
