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

import { AlertActionLink, AlertVariant } from '@patternfly/react-core';
import { History } from 'history';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { lazyInject } from '../inversify.config';
import IdeLoader, { AlertOptions } from '../pages/IdeLoader';
import { Debounce } from '../services/helpers/debounce';
import { delay } from '../services/helpers/delay';
import { IdeLoaderTab, WorkspaceStatus } from '../services/helpers/types';
import { AppState } from '../store';
import { selectIsDevelopment } from '../store/Environment/selectors';
import * as WorkspaceStore from '../store/Workspaces';
import { selectAllWorkspaces, selectIsLoading, selectLogs, selectWorkspaceById } from '../store/Workspaces/selectors';

type Props =
  MappedProps
  & { history: History }
  & RouteComponentProps<{ namespace: string; workspaceName: string }>;

export enum LoadIdeSteps {
  INITIALIZING = 1,
  START_WORKSPACE,
  OPEN_IDE
}

type State = {
  namespace: string;
  workspaceName: string;
  workspaceId?: string;
  currentStep: LoadIdeSteps;
  preselectedTabKey?: IdeLoaderTab;
  ideUrl?: string;
  hasError: boolean;
};

class IdeLoaderContainer extends React.PureComponent<Props, State> {

  @lazyInject(Debounce)
  private readonly debounce: Debounce;

  private readonly loadFactoryPageCallbacks: {
    showAlert?: (alertOptions: AlertOptions) => void
  };

  constructor(props: Props) {
    super(props);

    this.loadFactoryPageCallbacks = {};
    const { match: { params }, history } = this.props;
    const namespace = params.namespace;
    const workspaceName = (this.workspaceName.split('&'))[0];

    if (workspaceName !== this.workspaceName) {
      const pathname = `/ide/${namespace}/${workspaceName}`;
      history.replace({ pathname });
    }

    const workspace = this.props.allWorkspaces.find(workspace =>
      workspace.namespace === params.namespace && workspace.devfile.metadata.name === this.workspaceName);
    this.state = {
      currentStep: LoadIdeSteps.INITIALIZING,
      namespace,
      workspaceName,
      hasError: workspace?.status === WorkspaceStatus[WorkspaceStatus.ERROR],
      preselectedTabKey: this.preselectedTabKey,
    };

    this.debounce.subscribe(async () => {
      await this.initWorkspace();
    });
  }

  private get workspaceName(): string {
    const { match: { params } } = this.props;
    return params.workspaceName.split('?')[0];
  }

  private get preselectedTabKey(): IdeLoaderTab {
    const { history: { location: { search } } } = this.props;
    if (!search) {
      return IdeLoaderTab.Progress;
    }
    const searchParam = new URLSearchParams(search);
    const tab = searchParam.get('tab');
    if (tab) {
      return IdeLoaderTab[tab];
    }
    return IdeLoaderTab.Progress;
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
    if (this.loadFactoryPageCallbacks.showAlert) {
      this.loadFactoryPageCallbacks.showAlert(alertOptions);
    } else {
      console.error(alertOptions.title);
    }
  }

  public async componentWillUnmount(): Promise<void> {
    this.debounce.unsubscribeAll();
  }

  public async componentDidMount(): Promise<void> {
    const { isLoading, requestWorkspaces, allWorkspaces } = this.props;
    let workspace = allWorkspaces.find(workspace =>
      workspace.namespace === this.state.namespace && workspace.devfile.metadata.name === this.state.workspaceName);
    if (!isLoading && !workspace) {
      await requestWorkspaces();
      workspace = allWorkspaces.find(workspace =>
        workspace.namespace === this.state.namespace && workspace.devfile.metadata.name === this.state.workspaceName);
    }
    if (workspace && workspace.runtime && workspace.status === WorkspaceStatus[WorkspaceStatus.RUNNING]) {
      return await this.updateIdeUrl(workspace.runtime);
    } else if (workspace && workspace.status == WorkspaceStatus[WorkspaceStatus.ERROR]) {
      this.showErrorAlert(workspace);
    }
    this.debounce.setDelay(1000);
  }

  private showErrorAlert(workspace: che.Workspace) {
    const wsLogs = this.props.workspacesLogs.get(workspace.id) || [];
    const alertActionLinks = this.errorActionLinks(workspace);
    this.showAlert({
      alertActionLinks: alertActionLinks,
      title: `Workspace ${this.state.workspaceName} failed to start`,
      body: this.findErrorLogs(wsLogs).join('\n'),
      alertVariant: AlertVariant.danger
    });
  }

  public async componentDidUpdate(prevProps: Props, prevState: State): Promise<void> {
    const { allWorkspaces, match: { params } } = this.props;
    const { hasError } = this.state;
    const workspace = allWorkspaces.find(workspace =>
      workspace.namespace === params.namespace
      && workspace.devfile.metadata.name === this.workspaceName);
    if (!workspace) {
      const alertOptions = {
        title: `Workspace "${this.workspaceName}" is not found.`,
        alertVariant: AlertVariant.danger,
      };
      if (this.loadFactoryPageCallbacks.showAlert) {
        this.loadFactoryPageCallbacks.showAlert(alertOptions);
      } else {
        console.error(alertOptions.title);
      }
      this.setState({
        hasError: true,
      });
    } else if (workspace.status === WorkspaceStatus[WorkspaceStatus.ERROR]) {
      if ((prevState.workspaceName === this.workspaceName) && !hasError) {
        // When the current workspace didn't have an error but now does then show it
        this.showErrorAlert(workspace);
      } else if ((prevState.workspaceName !== this.workspaceName)) {
        // When the clicked workspace changes and the new one errors then show the new error message
        this.setState({
          hasError: true,
          workspaceName: this.workspaceName,
          currentStep: LoadIdeSteps.START_WORKSPACE,
          workspaceId: workspace.id,
        });
        this.showErrorAlert(workspace);
      }
    } else if (prevState.workspaceName !== this.workspaceName) {
      // There is no error in the newly opened workspace so just reset the status back to the initial state
      this.setState({
        hasError: false,
        workspaceName: this.workspaceName,
        currentStep: LoadIdeSteps.INITIALIZING,
        workspaceId: workspace.id,
      });
    }
    this.debounce.setDelay(1000);
  }

  private findErrorLogs(wsLogs: string[]): string[] {
    const errorLogs: string[] = [];
    wsLogs.forEach(e => {
      if (e.startsWith('Error: Failed to run the workspace')) {
        // Remove the default error message and the quotations that surround the error
        const strippedError = e.replace('Error: Failed to run the workspace: ', '').slice(1, -1);
        errorLogs.push(strippedError);
      }
    });
    return errorLogs;
  }

  private errorActionLinks(workspace: che.Workspace): React.ReactFragment {
    return (
      <React.Fragment>
        <AlertActionLink onClick={async () => {
          this.verboseModeHandler(workspace);
        }}>Open in Verbose mode</AlertActionLink>
        <AlertActionLink onClick={() => {
          // Since patternfly appends numbers to an id we can't just get the tab by id so look for the tab item with Logs
          this.logsHandler();
        }}>Open Logs</AlertActionLink>
      </React.Fragment>
    );
  }

  private async verboseModeHandler(workspace: che.Workspace) {
    try {
      await this.props.startWorkspace(workspace.id, { 'debug-workspace-start': true });
      this.props.deleteWorkspaceLogs(workspace.id);
      this.setState({
        currentStep: LoadIdeSteps.INITIALIZING,
        hasError: false
      });

      // Set the workspaces status to starting manually so that when initWorkspace
      // is triggered on the debounce the workspace won't be attempted to start twice
      workspace.status = 'STARTING';

      this.logsHandler();
    } catch (e) {
      this.showAlert(`Workspace ${this.state.workspaceName} failed to start. ${e}`);
    }
  }

  private logsHandler() {
    const elements: any = Array.from(document.getElementsByClassName('pf-c-tabs__item'));
    for (const ele of elements) {
      if (ele.innerText === 'Logs') {
        ele.firstChild.click();
      }
    }
  }

  private async updateIdeUrl(runtime: api.che.workspace.Runtime): Promise<void> {
    let ideUrl = '';
    const machines = runtime.machines || {};
    for (const machineName of Object.keys(machines)) {
      const servers = machines[machineName].servers || {};
      for (const serverId of Object.keys(servers)) {
        const attributes = (servers[serverId] as any).attributes;
        if (attributes && attributes['type'] === 'ide') {
          ideUrl = servers[serverId].url;
          break;
        }
      }
    }
    if (!ideUrl) {
      this.showAlert('Don\'t know what to open, IDE url is not defined.');
      return;
    }
    if (this.props.isDevelopment) {
      // workaround to open IDE in iframe while serving dashboard locally
      try {
        const windowRef = window.open(ideUrl);
        await delay(2000);
        windowRef?.close();
      } catch (e) {
        // noop
      }
    }
    this.setState({ currentStep: LoadIdeSteps.OPEN_IDE, ideUrl });
  }

  private async openIDE(workspaceId: string): Promise<void> {
    this.setState({ currentStep: LoadIdeSteps.OPEN_IDE });
    try {
      await this.props.requestWorkspace(workspaceId);
    } catch (e) {
      this.showAlert(`Getting workspace detail data failed. ${e}`);
      return;
    }
    const workspace = this.props.allWorkspaces.find(workspace =>
      workspace.id === workspaceId);
    if (workspace && workspace.runtime) {
      await this.updateIdeUrl(workspace.runtime);
    }
  }

  private async initWorkspace(): Promise<void> {
    const { allWorkspaces, match: { params } } = this.props;
    const { namespace, workspaceName } = this.state;

    const workspace = allWorkspaces.find(workspace =>
      workspace.namespace === params.namespace && workspace.devfile.metadata.name === this.workspaceName);
    if (namespace !== params.namespace || workspaceName !== this.workspaceName) {
      this.setState({
        currentStep: LoadIdeSteps.INITIALIZING,
        hasError: workspace?.status === WorkspaceStatus[WorkspaceStatus.ERROR] ? true : false,
        ideUrl: '',
        namespace: params.namespace,
        workspaceName: this.workspaceName,
      });
      return;
    } else if (this.state.currentStep === LoadIdeSteps.OPEN_IDE) {
      return;
    }
    if (workspace) {
      this.setState({ workspaceId: workspace.id });
      if ((workspace.runtime || this.state.currentStep === LoadIdeSteps.START_WORKSPACE) &&
        workspace.status === WorkspaceStatus[WorkspaceStatus.RUNNING]) {
        return this.openIDE(workspace.id);
      }
    } else {
      this.showAlert('Failed to find the target workspace.');
      return;
    }
    if (this.state.currentStep === LoadIdeSteps.INITIALIZING) {
      this.setState({ currentStep: LoadIdeSteps.START_WORKSPACE });
      if (workspace.status === WorkspaceStatus[WorkspaceStatus.STOPPED] && (this.state.hasError !== true)) {
        try {
          await this.props.startWorkspace(`${workspace.id}`);
        } catch (e) {
          this.showAlert(`Workspace ${this.state.workspaceName} failed to start. ${e}`);
          return;
        }
      }
    }
  }

  render() {
    const { currentStep, hasError, ideUrl, workspaceId, workspaceName, preselectedTabKey } = this.state;

    return (
      <IdeLoader
        currentStep={currentStep}
        workspaceId={workspaceId || ''}
        preselectedTabKey={preselectedTabKey}
        ideUrl={ideUrl}
        hasError={hasError}
        workspaceName={workspaceName || ''}
        callbacks={this.loadFactoryPageCallbacks}
      />
    );
  }

}

const mapStateToProps = (state: AppState) => ({
  workspace: selectWorkspaceById(state),
  allWorkspaces: selectAllWorkspaces(state),
  isLoading: selectIsLoading(state),
  workspacesLogs: selectLogs(state),
  isDevelopment: selectIsDevelopment(state),
});

const connector = connect(
  mapStateToProps,
  WorkspaceStore.actionCreators,
);
type MappedProps = ConnectedProps<typeof connector>;
export default connector(IdeLoaderContainer);
