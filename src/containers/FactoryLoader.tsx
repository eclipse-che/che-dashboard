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
import FactoryLoader from '../pages/FactoryLoader';
import { selectAllWorkspaces, selectWorkspaceById } from '../store/Workspaces/selectors';
import { WorkspaceStatus } from '../services/helpers/types';
import { buildIdeLoaderPath, sanitizeLocation } from '../services/helpers/location';
import { merge } from 'lodash';

const WS_ATTRIBUTES_TO_SAVE: string[] = ['workspaceDeploymentLabels', 'workspaceDeploymentAnnotations', 'policies.create'];

const DEFAULT_CREATE_POLICY = 'perclick';

type CreatePolicy = 'perclick' | 'peruser';

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
  search?: string;
  location?: string;
  devfileLocationInfo?: string;
  currentStep: LoadFactorySteps;
  hasError: boolean;
  createPolicy: CreatePolicy;
};

export class FactoryLoaderContainer extends React.PureComponent<Props, State> {
  private factoryLoaderCallbacks: { showAlert?: (variant: AlertVariant, title: string) => void } = {};
  private factoryResolver: FactoryResolverStore.State;
  private overrideDevfileObject: Partial<che.WorkspaceDevfile> = {};

  constructor(props: Props) {
    super(props);

    const { search } = this.props.history.location;

    this.state = {
      currentStep: LoadFactorySteps.INITIALIZING,
      hasError: false,
      createPolicy: DEFAULT_CREATE_POLICY,
      search,
    };
  }

  private resetOverrideParams(): void {
    this.overrideDevfileObject = {};
  }

  private updateOverrideParams(key: string, val: string): void {
    if (key.startsWith('override.')) {
      const overrideKeys: string[] = [];
      const pattern = new RegExp('([^.=]+)', 'g');
      let regExpExecArray: RegExpExecArray | null = null;
      while ((regExpExecArray = pattern.exec(key)) !== null) {
        overrideKeys.push(regExpExecArray[0]);
      }
      if (overrideKeys.length > 0) {
        let currentVal = this.overrideDevfileObject;
        for (let index = 1; index < overrideKeys.length; index++) {
          currentVal[overrideKeys[index]] = index === overrideKeys.length - 1 ? val : {};
          currentVal = currentVal[overrideKeys[index]];
        }
      }
    }
  }

  private getTargetDevfile(): api.che.workspace.devfile.Devfile | undefined {
    const devfile = this.factoryResolver.resolver.devfile;
    if (!devfile) {
      return undefined;
    }

    return merge(devfile, this.overrideDevfileObject);
  }

  public showAlert(message: string, alertVariant: AlertVariant = AlertVariant.danger): void {
    if (alertVariant === AlertVariant.danger) {
      this.setState({ hasError: true });
    }
    if (this.factoryLoaderCallbacks.showAlert) {
      this.factoryLoaderCallbacks.showAlert(alertVariant, message);
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
      await this.openIde();
    }

    if (workspace &&
      WorkspaceStatus[workspace.status] === WorkspaceStatus.ERROR &&
      this.state.currentStep === LoadFactorySteps.START_WORKSPACE) {
      this.showAlert('Unknown workspace error.');
    }
  }

  private async openIde(): Promise<void> {
    const { history, workspace } = this.props;
    if (!workspace || WorkspaceStatus[workspace.status] !== WorkspaceStatus.RUNNING) {
      return;
    }
    this.setState({ currentStep: LoadFactorySteps.OPEN_IDE });
    try {
      await this.props.requestWorkspace(workspace.id);
    } catch (e) {
      this.showAlert(`Getting workspace detail data failed. ${e}`);
    }
    await delay();
    history.push(buildIdeLoaderPath(workspace));
  }

  private isCreatePolicy(val: string): val is CreatePolicy {
    return val && (val as CreatePolicy) === 'perclick' || (val as CreatePolicy) === 'peruser';
  }

  private getCreatePolicy(attrs: { [key: string]: string }): CreatePolicy | undefined {
    const policy = attrs['policies.create'] || DEFAULT_CREATE_POLICY;
    if (this.isCreatePolicy(policy)) {
      return policy;
    }
    this.showAlert(`Unsupported create policy 'policies.create=${policy}'`);
    return undefined;
  }

  private clearOldData(): void {
    if (this.props.workspace) {
      this.props.clearWorkspaceId();
    }
    this.resetOverrideParams();
    this.setState({ hasError: false });
  }

  private getSearchParam(): string | undefined {
    const { location: dirtyLocation } = this.props.history;
    const { search } = sanitizeLocation(dirtyLocation);
    if (!search) {
      this.showAlert(
        `Repository/Devfile URL is missing. Please specify it via url query param: ${window.location.origin}${window.location.pathname}#/load-factory?url= .`,
      );
    }
    return search;
  }

  private getLocation(search: string): string | undefined {
    const searchParam = new window.URLSearchParams(search);
    const location = searchParam.get('url');
    if (!location) {
      this.showAlert(
        `Repository/Devfile URL is missing. Please specify it via url query param: ${window.location.origin}${window.location.pathname}#/load-factory?url= .`,
      );
      return;
    }
    return location;
  }

  private getAttributes(location: string, search: string): { [key: string]: string } {
    const searchParam = new window.URLSearchParams(search);
    searchParam.delete('url');
    // set devfile attributes
    const attrs: { [key: string]: string } = {};
    const factoryUrl = new window.URL(location);
    searchParam.forEach((val: string, key: string) => {
      if (WS_ATTRIBUTES_TO_SAVE.indexOf(key) !== -1) {
        attrs[key] = val;
      }
      this.updateOverrideParams(key, val);
      factoryUrl.searchParams.append(key, val);
    });
    attrs.stackName = factoryUrl.toString();

    return attrs;
  }

  private async resolveDevfile(location: string): Promise<api.che.workspace.devfile.Devfile | undefined> {
    try {
      await this.props.requestFactoryResolver(location);
    } catch (e) {
      this.showAlert('Failed to resolve a devfile.');
      return undefined;
    }
    if (!this.factoryResolver
      || !this.factoryResolver.resolver
      || !this.factoryResolver.resolver.devfile
      || this.factoryResolver.resolver.location !== location) {
      this.showAlert('Failed to resolve a devfile.');
      return undefined;
    }
    const { source } = this.factoryResolver.resolver;
    const searchParam = new window.URLSearchParams(this.state.search);
    const devfileLocationInfo = !source || source === 'repo' ?
      `${searchParam.get('url')}` :
      `\`${source}\` in github repo ${location}`;
    this.setState({ devfileLocationInfo });
    return this.getTargetDevfile();
  }

  private async resolveWorkspace(devfile: api.che.workspace.devfile.Devfile, attrs: { [key: string]: string }): Promise<che.Workspace | undefined> {
    let workspace: che.Workspace | undefined;
    if (this.state.createPolicy === 'peruser') {
      workspace = this.props.allWorkspaces.find(workspace => {
        return workspace.attributes && workspace.attributes.stackName === attrs.stackName;
      });
    }
    if (!workspace) {
      try {
        workspace = await this.props.createWorkspaceFromDevfile(devfile, undefined, undefined, attrs);
      } catch (e) {
        this.showAlert(`Failed to create a workspace. ${e}`);
        return undefined;
      }
    }
    if (!workspace) {
      this.showAlert('Failed to create a workspace.');
      return undefined;
    }
    // check if it ephemeral
    if (workspace.devfile.attributes &&
      workspace.devfile.attributes.persistVolumes === 'false' &&
      workspace.devfile.attributes.asyncPersist !== 'true'
    ) {
      this.showAlert('You\'re starting an ephemeral workspace. All changes to the source code will be lost ' +
        'when the workspace is stopped unless they are pushed to a remote code repository.', AlertVariant.warning);
    }

    return workspace;
  }

  private async startWorkspace(): Promise<void> {
    const workspace = this.props.workspace;
    if (!workspace) {
      return;
    }
    if (this.state.currentStep !== LoadFactorySteps.START_WORKSPACE
      && this.state.currentStep !== LoadFactorySteps.OPEN_IDE) {
      try {
        await this.props.requestWorkspace(workspace.id);
        if (WorkspaceStatus[workspace.status] === WorkspaceStatus.STOPPED) {
          await this.props.startWorkspace(workspace.id);
          this.setState({ currentStep: LoadFactorySteps.START_WORKSPACE });
        } else if (WorkspaceStatus[workspace.status] === WorkspaceStatus.RUNNING) {
          this.setState({ currentStep: LoadFactorySteps.START_WORKSPACE });
        }
      } catch (e) {
        this.showAlert(`Getting workspace detail data failed. ${e}`);
      }
    }
  }

  private async createWorkspaceFromFactory(): Promise<void> {
    this.clearOldData();

    const search = this.getSearchParam();

    if (!search) {
      return;
    }
    this.setState({ search, currentStep: LoadFactorySteps.CREATE_WORKSPACE });

    const location = this.getLocation(search);

    if (!location) {
      return;
    }

    const attrs = this.getAttributes(location, search);
    const createPolicy = this.getCreatePolicy(attrs);

    if (!createPolicy) {
      return;
    }
    this.setState({ location, createPolicy, currentStep: LoadFactorySteps.LOOKING_FOR_DEVFILE });

    await delay();

    const devfile = await this.resolveDevfile(location);

    if (!devfile) {
      return;
    }
    this.setState({ currentStep: LoadFactorySteps.APPLYING_DEVFILE });

    await delay();

    const workspace = await this.resolveWorkspace(devfile, attrs);

    if (!workspace) {
      return;
    }

    this.props.setWorkspaceId(workspace.id);

    await this.startWorkspace();

    await this.openIde();
  }

  render() {
    const { workspace } = this.props;
    const { currentStep, devfileLocationInfo, hasError } = this.state;
    const workspaceName = workspace && workspace.devfile.metadata.name ? workspace.devfile.metadata.name : '';
    const workspaceId = workspace ? workspace.id : '';

    return (
      <FactoryLoader
        currentStep={currentStep}
        hasError={hasError}
        devfileLocationInfo={devfileLocationInfo}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        callbacks={this.factoryLoaderCallbacks}
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
export default connector(FactoryLoaderContainer);
