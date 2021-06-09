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

import { AlertActionLink, AlertVariant } from '@patternfly/react-core';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { History } from 'history';
import { delay } from '../services/helpers/delay';
import { AppState } from '../store';
import * as FactoryResolverStore from '../store/FactoryResolver';
import * as WorkspaceStore from '../store/Workspaces';
import FactoryLoader from '../pages/FactoryLoader';
import { selectAllWorkspaces, selectWorkspaceById } from '../store/Workspaces/selectors';
import { selectPreferredStorageType } from '../store/Workspaces/Settings/selectors';
import { buildIdeLoaderLocation, sanitizeLocation } from '../services/helpers/location';
import { lazyInject } from '../inversify.config';
import { KeycloakAuthService } from '../services/keycloak/auth';
import { getEnvironment, isDevEnvironment } from '../services/helpers/environment';
import { isOAuthResponse } from '../store/FactoryResolver';
import { updateDevfile } from '../services/storageTypes';
import { isWorkspaceV1, Workspace } from '../services/workspaceAdapter';
import { AlertOptions } from '../pages/FactoryLoader';
import { selectInfrastructureNamespaces } from '../store/InfrastructureNamespaces/selectors';

const WS_ATTRIBUTES_TO_SAVE: string[] = ['workspaceDeploymentLabels', 'workspaceDeploymentAnnotations', 'policies.create'];

const DEFAULT_CREATE_POLICY = 'perclick';
type CreatePolicy = 'perclick' | 'peruser';

enum ErrorCodes {
  INVALID_REQUEST = 'invalid_request',
  ACCESS_DENIED = 'access_denied'
}

export enum LoadFactorySteps {
  INITIALIZING = 0,
  CREATE_WORKSPACE = 1,
  LOOKING_FOR_DEVFILE,
  APPLYING_DEVFILE,
  START_WORKSPACE,
  OPEN_IDE
}

type Props =
  MappedProps
  & { history: History };

type State = {
  search?: string;
  location?: string;
  devfileLocationInfo?: string;
  currentStep: LoadFactorySteps;
  hasError: boolean;
  createPolicy: CreatePolicy;
};

export class FactoryLoaderContainer extends React.PureComponent<Props, State> {
  private factoryLoaderCallbacks: { showAlert?: (options: AlertOptions) => void } = {};
  private factoryResolver: FactoryResolverStore.State;
  private overrideDevfileObject: {
    [params: string]: string
  } = {};

  @lazyInject(KeycloakAuthService)
  private readonly keycloakAuthService: KeycloakAuthService;

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
    this.overrideDevfileObject[key] = val;
  }

  private getTargetDevfile(): api.che.workspace.devfile.Devfile | undefined {
    let devfile = this.factoryResolver.resolver.devfile;
    if (!devfile) {
      return undefined;
    }

    if (
      devfile?.attributes?.persistVolumes === undefined &&
      devfile?.attributes?.asyncPersist === undefined &&
      this.props.preferredStorageType
    ) {
      devfile = updateDevfile(devfile, this.props.preferredStorageType);
    }

    return devfile;
  }

  public showAlert(alertOptions: string | AlertOptions): void {
    if (typeof alertOptions == 'string') {
      const currentAlertOptions = alertOptions;
      alertOptions = {
        title: currentAlertOptions,
        alertVariant: AlertVariant.danger
      } as AlertOptions;
    }
    if (alertOptions.alertVariant === AlertVariant.danger) {
      this.setState({ hasError: true });
    }
    if (this.factoryLoaderCallbacks.showAlert) {
      this.factoryLoaderCallbacks.showAlert(alertOptions);
    } else {
      console.error(alertOptions.title);
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
      workspace && workspace.isRunning) {
      await this.openIde();
    }

    if (workspace &&
      workspace.hasError &&
      this.state.currentStep === LoadFactorySteps.START_WORKSPACE) {
      this.showAlert('Unknown workspace error.');
    }
  }

  private async openIde(): Promise<void> {
    const { history, workspace } = this.props;
    if (!workspace || !workspace.isRunning) {
      return;
    }
    this.setState({ currentStep: LoadFactorySteps.OPEN_IDE });
    try {
      await this.props.requestWorkspace(workspace);
    } catch (e) {
      this.showAlert(`Getting workspace detail data failed. ${e}`);
    }
    await delay();
    history.push(buildIdeLoaderLocation(workspace));
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

  private getErrorCode(search: string): string | undefined {
    const searchParam = new window.URLSearchParams(search);
    const errorCode = searchParam.get('error_code');
    if (!errorCode) {
      return;
    }
    return errorCode;
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
      if (key.startsWith('override.')) {
        this.updateOverrideParams(key, val);
      }
      factoryUrl.searchParams.append(key, val);
    });
    attrs.stackName = factoryUrl.toString();

    return attrs;
  }

  private async resolveDevfile(location: string): Promise<api.che.workspace.devfile.Devfile | undefined> {
    const override = Object.entries(this.overrideDevfileObject).length ? this.overrideDevfileObject : undefined;
    try {
      await this.props.requestFactoryResolver(location, override);
    } catch (e) {
      if (isOAuthResponse(e)) {
        this.resolvePrivateDevfile(e.attributes.oauth_authentication_url, location);
        return;
      }

      this.showAlert('Failed to resolve a devfile. ' + (e.message || ''));
      return;
    }
    if (this.factoryResolver.resolver?.location !== location) {
      this.showAlert('Failed to resolve a devfile.');
      return;
    }
    const { source } = this.factoryResolver.resolver;
    const searchParam = new window.URLSearchParams(this.state.search);
    const devfileLocationInfo = !source || source === 'repo' ?
      `${searchParam.get('url')}` :
      `\`${source}\` in github repo ${location}`;
    this.setState({ devfileLocationInfo });
    return this.getTargetDevfile();
  }

  private resolvePrivateDevfile(oauthUrl: string, location: string): void {
    try {
      // looking for a pre-created infrastructure namespace
      const namespaces = this.props.infrastructureNamespaces;
      if (namespaces.length === 1) {
        if (!namespaces[0].attributes.phase) {
          this.showAlert('Failed to accept the factory URL. The infrastructure namespace is required to be created. Please create a regular workspace to workaround the issue and open factory URL again.');
          return;
        }
      }

      const env = getEnvironment();
      // build redirect URL
      let redirectHost = window.location.protocol + '//' + window.location.host;
      if (isDevEnvironment(env)) {
        redirectHost = env.server;
      }
      const redirectUrl = new URL('/f', redirectHost);
      redirectUrl.searchParams.set('url', location);

      const oauthUrlTmp = new window.URL(oauthUrl);
      if (KeycloakAuthService.keycloak) {
        oauthUrlTmp.searchParams.set('token', KeycloakAuthService.keycloak.token as string);
      }
      const fullOauthUrl = oauthUrlTmp.toString() + '&redirect_after_login=' + redirectUrl.toString();

      if (isDevEnvironment(env)) {
        window.open(fullOauthUrl);
      } else {
        window.location.href = fullOauthUrl;
      }
    } catch (e) {
      this.showAlert('Failed to open authentication page.');
      throw e;
    }
  }

  private async resolveWorkspace(devfile: api.che.workspace.devfile.Devfile, attrs: { [key: string]: string }): Promise<Workspace | undefined> {
    let workspace: Workspace | undefined;
    if (this.state.createPolicy === 'peruser') {
      workspace = this.props.allWorkspaces.find(workspace => {
        if (isWorkspaceV1(workspace.ref)) {
          // looking for the stack name attribute in Che workspace
          return workspace.ref.attributes && workspace.ref.attributes.stackName === attrs.stackName;
        }
        else {
          // ignore createPolicy for dev workspaces
          return false;
        }
      });
    }
    if (!workspace) {
      try {
        workspace = await this.props.createWorkspaceFromDevfile(devfile, undefined, undefined, attrs, this.factoryResolver.resolver.optionalFilesContent || {});
      } catch (e) {
        this.showAlert(`Failed to create a workspace. ${e}`);
        return;
      }
    }
    if (!workspace) {
      this.showAlert('Failed to create a workspace.');
      return;
    }
    // check if it ephemeral
    // not implemented for dev workspaces yet
    if (isWorkspaceV1(workspace.ref) && workspace.storageType === 'ephemeral') {
      this.showAlert({
        title: 'You\'re starting an ephemeral workspace. All changes to the source code will be lost ' +
          'when the workspace is stopped unless they are pushed to a remote code repository.',
        alertVariant: AlertVariant.warning
      });
    }

    return workspace;
  }

  private tryAgainHandler(): void {
    const searchParams = new window.URLSearchParams(this.props.history.location.search);
    searchParams.delete('error_code');
    this.props.history.location.search = searchParams.toString();
    this.props.history.push(this.props.history.location);
  }

  private errorActionLinks(): React.ReactFragment {
    return (
      <React.Fragment>
        <AlertActionLink onClick={() => {
          this.tryAgainHandler();
        }}>Click to try again</AlertActionLink>
      </React.Fragment>
    );
  }

  private async startWorkspace(): Promise<void> {
    const workspace = this.props.workspace;
    if (!workspace) {
      return;
    }
    if (this.state.currentStep !== LoadFactorySteps.START_WORKSPACE
      && this.state.currentStep !== LoadFactorySteps.OPEN_IDE) {
      try {
        await this.props.requestWorkspace(workspace);
        if (workspace.isStopped) {
          await this.props.startWorkspace(workspace);
          this.setState({ currentStep: LoadFactorySteps.START_WORKSPACE });
        } else if (workspace.isRunning || workspace.isStarting) {
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

    const errorCode = this.getErrorCode(search);
    if (errorCode === ErrorCodes.INVALID_REQUEST) {
      this.showAlert({
        alertActionLinks: this.errorActionLinks(),
        title: 'Could not resolve devfile from private repository because authentication request is missing' +
          ' a parameter, contains an invalid parameter, includes a parameter more than once, or is otherwise invalid.',
        alertVariant: AlertVariant.danger,
      });
      return;
    }
    if (errorCode === ErrorCodes.ACCESS_DENIED) {
      if (!this.state.hasError) {
        this.showAlert({
          alertActionLinks: this.errorActionLinks(),
          title: 'Could not resolve devfile from private repository because the user or authorization server denied the authentication request.',
          alertVariant: AlertVariant.danger,
        });
      }
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
    const workspaceName = workspace ? workspace.name : '';
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
  infrastructureNamespaces: selectInfrastructureNamespaces(state),
  preferredStorageType: selectPreferredStorageType(state),
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
