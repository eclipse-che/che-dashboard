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

import { helpers } from '@eclipse-che/common';
import { AlertVariant, PageSection, PageSectionVariants } from '@patternfly/react-core';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import ProgressIndicator from '@/components/Progress';
import { lazyInject } from '@/inversify.config';
import { GitConfigAddModal } from '@/pages/UserPreferences/GitConfig/AddModal';
import { GitConfigEmptyState } from '@/pages/UserPreferences/GitConfig/EmptyState';
import { GitConfigForm } from '@/pages/UserPreferences/GitConfig/Form';
import { GitConfigToolbar } from '@/pages/UserPreferences/GitConfig/Toolbar';
import { GitConfigViewer } from '@/pages/UserPreferences/GitConfig/Viewer';
import { AppAlerts } from '@/services/alerts/appAlerts';
import { RootState } from '@/store';
import * as GitConfigStore from '@/store/GitConfig';
import { gitConfigActionCreators } from '@/store/GitConfig';
import {
  selectGitConfig,
  selectGitConfigError,
  selectGitConfigIsLoading,
} from '@/store/GitConfig/selectors';

export type Props = MappedProps;

export type State = {
  isAddEditOpen: boolean;
  mode: 'form' | 'viewer';
};

class GitConfig extends React.PureComponent<Props, State> {
  @lazyInject(AppAlerts)
  private readonly appAlerts: AppAlerts;

  constructor(props: Props) {
    super(props);

    this.state = {
      isAddEditOpen: false,
      mode: 'form',
    };
  }

  public async componentDidMount(): Promise<void> {
    const { gitConfigIsLoading } = this.props;

    if (gitConfigIsLoading === true) {
      this.init();
      return;
    }

    await this.handleReload();
  }

  public componentDidUpdate(prevProps: Props): void {
    this.init(prevProps);
  }

  private init(prevProps?: Props): void {
    const { gitConfigError } = this.props;
    const prevGitConfigError = prevProps?.gitConfigError;
    if (gitConfigError && gitConfigError !== prevGitConfigError) {
      this.appAlerts.showAlert({
        key: 'gitconfig-error',
        title: helpers.errors.getMessage(gitConfigError),
        variant: AlertVariant.danger,
      });
    } else if (gitConfigError === undefined && gitConfigError !== prevGitConfigError) {
      this.appAlerts.removeAlert('gitconfig-error');
    }
  }

  private async handleSave(gitConfig: GitConfigStore.GitConfig): Promise<void> {
    try {
      await this.props.updateGitConfig(gitConfig);
      this.appAlerts.showAlert({
        key: 'gitconfig-success',
        title: 'Gitconfig saved successfully.',
        variant: AlertVariant.success,
      });
    } catch (error) {
      console.error('Failed to update gitconfig', error);
    }
  }

  private async handleReload(): Promise<void> {
    try {
      await this.props.requestGitConfig();
    } catch (error) {
      console.error('Failed to reload gitconfig', error);
    }
  }

  private handleCloseAddEditModal(): void {
    this.setState({
      isAddEditOpen: false,
    });
  }

  private handleModeChange(mode: 'form' | 'viewer'): void {
    this.setState({ mode });
  }

  public render(): React.ReactElement {
    const { gitConfigIsLoading, gitConfig } = this.props;
    const { isAddEditOpen, mode } = this.state;

    const isEmpty = gitConfig === undefined;

    let gitConfigViewer = <></>;
    if (gitConfig !== undefined) {
      if (mode === 'form') {
        gitConfigViewer = (
          <GitConfigForm
            gitConfig={gitConfig}
            isLoading={gitConfigIsLoading}
            onSave={async gitConfig => await this.handleSave(gitConfig)}
            onReload={async () => await this.handleReload()}
          />
        );
      } else {
        gitConfigViewer = <GitConfigViewer config={gitConfig} />;
      }
    }

    return (
      <React.Fragment>
        <PageSection variant={PageSectionVariants.default}>
          <ProgressIndicator isLoading={gitConfigIsLoading} />
          <GitConfigAddModal
            gitConfig={gitConfig}
            isOpen={isAddEditOpen}
            onCloseModal={() => this.handleCloseAddEditModal()}
            onSave={async gitConfig => {
              await this.handleSave(gitConfig);
              this.handleCloseAddEditModal();
            }}
          />
          {isEmpty ? (
            <GitConfigEmptyState />
          ) : (
            <PageSection variant={PageSectionVariants.light}>
              <GitConfigToolbar
                mode={mode}
                onAdd={() => {
                  this.setState({
                    isAddEditOpen: true,
                  });
                }}
                onChangeMode={mode => this.handleModeChange(mode)}
              />
              {gitConfigViewer}
            </PageSection>
          )}
        </PageSection>
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  gitConfig: selectGitConfig(state),
  gitConfigIsLoading: selectGitConfigIsLoading(state),
  gitConfigError: selectGitConfigError(state),
});

const connector = connect(mapStateToProps, gitConfigActionCreators, null, {
  // forwardRef is mandatory for using `@react-mock/state` in unit tests
  forwardRef: true,
});

type MappedProps = ConnectedProps<typeof connector>;
export default connector(GitConfig);
