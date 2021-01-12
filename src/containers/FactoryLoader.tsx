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

import { AlertVariant } from '@patternfly/react-core';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { History } from 'history';
import { delay } from '../services/helpers/delay';
import { AppState } from '../store';
import * as FactoryResolverStore from '../store/FactoryResolver';
import * as WorkspaceStore from '../store/Workspaces';
import FactoryLoaderPage from '../pages/FactoryLoader';
import { selectAllWorkspaces, selectWorkspaceById } from '../store/Workspaces/selectors';
import { WorkspaceStatus } from '../services/helpers/types';

const WS_ATTRIBUTES_TO_SAVE: string[] = ['workspaceDeploymentLabels', 'workspaceDeploymentAnnotations'];
// todo remove it after investigation why does it happens sometimes
const SUPPRESSION_ATTRIBUTES: string[] = ['state', 'session_state', 'code'];

type Props =
  MappedProps
  & { history: History };

export enum LoadFactorySteps {
  INITIALIZING = 0,
  CREATE_WORKSPACE = 1,
  LOOKING_FOR_DEVFILE,
  APPLYING_DEVFILE,
  START_WORKSPACE,
  OPEN_IDE
}

type State = {
  search: string;
  location?: string;
  devfileLocationInfo?: string;
  currentStep: LoadFactorySteps;
  hasError: boolean;
};

export class FactoryLoader extends React.PureComponent<Props, State> {
  private loadFactoryPageCallbacks: { showAlert?: (variant: AlertVariant, title: string) => void } = {};
  private factoryResolver: FactoryResolverStore.State;

  constructor(props: Props) {
    super(props);

    const { search } = this.props.history.location;

    this.state = {
      currentStep: LoadFactorySteps.INITIALIZING,
      hasError: false,
      search,
    };
  }

  public showAlert(message: string, alertVariant: AlertVariant = AlertVariant.danger): void {
    if (alertVariant === AlertVariant.danger) {
      this.setState({ hasError: true });
    }
    if (this.loadFactoryPageCallbacks.showAlert) {
      this.loadFactoryPageCallbacks.showAlert(alertVariant, message);
    } else {
      console.error(message);
    }
  }

  public componentDidMount(): void {
    this.createWorkspaceFromFactory();
  }

  public async componentDidUpdate(): Promise<void> {
    const { history, workspace, factoryResolver } = this.props;
    if (this.state.search !== history.location.search) {
      this.setState({
        search: history.location.search,
        hasError: false,
      });
      return this.createWorkspaceFromFactory();
    }

    if (factoryResolver) {
      this.factoryResolver = factoryResolver;
    }

    if (this.state.currentStep === LoadFactorySteps.START_WORKSPACE &&
      workspace && WorkspaceStatus[workspace.status] === WorkspaceStatus.RUNNING) {
      this.setState({ currentStep: LoadFactorySteps.OPEN_IDE });
      try {
        await this.props.requestWorkspace(workspace.id);
      } catch (e) {
        this.showAlert(`Getting workspace detail data failed. ${e}`);
      }
      await delay();
      history.push(`/ide/${workspace.namespace}/${workspace.devfile.metadata.name}`);
    }

    if (workspace &&
      WorkspaceStatus[workspace.status] === WorkspaceStatus.ERROR &&
      this.state.currentStep === LoadFactorySteps.START_WORKSPACE) {
      this.showAlert('Unknown workspace error.');
    }
  }

  private async createWorkspaceFromFactory(): Promise<void> {
    const { search } = this.props.history.location;
    if (this.props.workspace) {
      this.props.clearWorkspaceId();
    }
    if (!search) {
      this.showAlert(
        `Repository/Devfile URL is missing. Please specify it via url query param:
         ${window.location.origin}${window.location.pathname}#/load-factory?url= .`,
      );
      return;
    } else {
      this.setState({ search, hasError: false });
    }
    const searchParam = new URLSearchParams(search.substring(1));

    // set devfile attributes
    const attrs: { [key: string]: string } = {};
    let location = '';
    let params = '';
    searchParam.forEach((val: string, key: string) => {
      if (key === 'url') {
        location = val;
      } else {
        if (WS_ATTRIBUTES_TO_SAVE.indexOf(key) !== -1) {
          attrs[key] = val;
        }
        if (SUPPRESSION_ATTRIBUTES.indexOf(key) === -1) {
          params += `${!params ? '?' : '&'}${key}=${val}`;
        }
      }
    });
    attrs.stackName = `${location}${params}`;
    this.setState({ currentStep: LoadFactorySteps.CREATE_WORKSPACE });
    if (!location) {
      this.showAlert(
        `Repository/Devfile URL is missing. Please specify it via url query param:
         ${window.location.origin}${window.location.pathname}#/load-factory?url= .`,
      );
      return;
    }
    this.setState({ currentStep: LoadFactorySteps.LOOKING_FOR_DEVFILE, location });
    await delay();
    try {
      await this.props.requestFactoryResolver(location);
    } catch (e) {
      this.showAlert('Failed to resolve a devfile.');
      return;
    }
    if (!this.factoryResolver
      || !this.factoryResolver.resolver
      || !this.factoryResolver.resolver.devfile
      || this.factoryResolver.resolver.location !== location) {
      this.showAlert('Failed to resolve a devfile.');
      return;
    }
    const { source } = this.factoryResolver.resolver;
    const devfileLocationInfo = !source || source === 'repo' ?
      `${searchParam.get('url')}` :
      `\`${source}\` in github repo ${location}`;
    this.setState({ currentStep: LoadFactorySteps.LOOKING_FOR_DEVFILE, devfileLocationInfo });
    const devfile = this.factoryResolver.resolver.devfile;
    this.setState({ currentStep: LoadFactorySteps.APPLYING_DEVFILE });
    await delay();

    let workspace: che.Workspace | null = null;
    try {
      workspace = await this.props.createWorkspaceFromDevfile(devfile, undefined, undefined, attrs) as any;
    } catch (e) {
      this.showAlert(`Failed to create a workspace. ${e}`);
      return;
    }
    if (!workspace) {
      this.showAlert('Failed to create a workspace.');
      return;
    }
    this.props.setWorkspaceId(workspace.id);
    // check if it ephemeral
    if (workspace.devfile.attributes &&
      workspace.devfile.attributes.persistVolumes === 'false' &&
      workspace.devfile.attributes.asyncPersist !== 'true'
    ) {
      this.showAlert('You\'re starting an ephemeral workspace. All changes to the source code will be lost ' +
        'when the workspace is stopped unless they are pushed to a remote code repository.', AlertVariant.warning);
    }
    await delay();
    if (this.state.currentStep !== LoadFactorySteps.START_WORKSPACE) {
      this.setState({ currentStep: LoadFactorySteps.START_WORKSPACE });
      const workspaceName = workspace.devfile.metadata.name;
      try {
        await this.props.startWorkspace(`${workspace.id}`);
      } catch (e) {
        this.showAlert(`Workspace ${workspaceName} failed to start. ${e.message ? e.message : ''}`);
        return;
      }
    }
  }

  render() {
    const { workspace } = this.props;
    const { currentStep, devfileLocationInfo, hasError } = this.state;
    const workspaceName = workspace && workspace.devfile.metadata.name ? workspace.devfile.metadata.name : '';
    const workspaceId = workspace ? workspace.id : '';

    return (
      <FactoryLoaderPage
        currentStep={currentStep}
        hasError={hasError}
        devfileLocationInfo={devfileLocationInfo}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        callbacks={this.loadFactoryPageCallbacks}
      />
    );
  }

}

const mapStateToProps = (state: AppState) => ({
  factoryResolver: state.factoryResolver,
  workspace: selectWorkspaceById(state),
  allWorkspaces: selectAllWorkspaces(state),
});

const connector = connect(
  mapStateToProps,
  {
    ...FactoryResolverStore.actionCreators,
    ...WorkspaceStore.actionCreators,
  },
);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(FactoryLoader);
