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

import React from 'react';
import { History } from 'history';
import { connect, ConnectedProps } from 'react-redux';
import { CancellablePromise, Cancellation, pseudoCancellable } from 'real-cancellable-promise';
import { AlertVariant } from '@patternfly/react-core';
import common from '@eclipse-che/common';
import { AppState } from '../../store';
import {
  selectWorkspaceByUID,
  selectAllWorkspaces,
  selectIsLoading,
  selectLogs,
} from '../../store/Workspaces/selectors';
import { selectDevworkspacesEnabled } from '../../store/Workspaces/Settings/selectors';
import * as WorkspaceStore from '../../store/Workspaces';
import { IdeLoaderSteps, List, LoaderStep } from '../../components/Loader/Step';
import { buildSteps } from '../../components/Loader/Step/buildSteps';
import { IdeLoader } from '../../pages/IdeLoader';
import { RouteComponentProps } from 'react-router';
import { Workspace } from '../../services/workspace-adapter';
import { WorkspaceStatus, DevWorkspaceStatus } from '../../services/helpers/types';
import { DisposableCollection } from '../../services/helpers/disposable';
import { delay } from '../../services/helpers/delay';
import getRandomString from '../../services/helpers/random';
import { filterErrorLogs } from '../../services/helpers/filterErrorLogs';
import { IdeIframe } from '../../pages/IdeIframe';
import { ToggleBarsContext } from '../../contexts/ToggleBars';
import { buildWorkspacesLocation } from '../../services/helpers/location';

export const TIMEOUT_TO_STOP_SEC = 60;
export const TIMEOUT_TO_RUN_SEC = 5 * 60;
export const TIMEOUT_TO_GET_URL_SEC = 20;
const MIN_STEP_DURATION_MS = 200;

export type Props = MappedProps &
  RouteComponentProps<{
    namespace: string;
    workspaceName: string;
  }> & {
    history: History;
  };
export type State = {
  currentStepIndex: number; // not ID, but index
  ideUrl?: string;
  lastError?: string;
  shouldStart: boolean; // should the loader start a workspace?
  tabParam?: string;
  matchParams: {
    namespace: string;
    workspaceName: string;
  };
};

class IdeLoaderContainer extends React.Component<Props, State> {
  private readonly toDispose = new DisposableCollection();
  private stepsList: List<LoaderStep>;

  static contextType = ToggleBarsContext;
  readonly context: React.ContextType<typeof ToggleBarsContext>;

  constructor(props: Props) {
    super(props);

    const { match, history } = this.props;
    const searchParams = new URLSearchParams(history.location.search);
    const tabParam = searchParams.get('tab') || undefined;

    this.state = {
      currentStepIndex: 0,
      shouldStart: true,
      tabParam,
      matchParams: match.params,
    };

    this.stepsList = buildSteps();
  }

  public componentDidMount() {
    const workspace = this.findTargetWorkspace(this.props, this.state);
    this.setBarsVisibility(workspace?.isDevWorkspace);

    this.startLoading();
  }

  public async componentDidUpdate() {
    this.toDispose.dispose();

    const workspace = this.findTargetWorkspace(this.props, this.state);
    this.setBarsVisibility(workspace?.isDevWorkspace);

    if (
      workspace?.status === WorkspaceStatus.STARTING ||
      workspace?.status === DevWorkspaceStatus.STARTING
    ) {
      // prevent a workspace being repeatedly restarted, once it's starting
      this.setState({
        shouldStart: false,
      });
    }

    this.startLoading();
  }

  public shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    const workspace = this.findTargetWorkspace(this.props, this.state);
    const nextWorkspace = this.findTargetWorkspace(nextProps, nextState);

    // switch to the next step
    if (this.state.currentStepIndex !== nextState.currentStepIndex) {
      return true;
    }
    // change workspace status, etc.
    if (
      workspace?.uid !== nextWorkspace?.uid ||
      workspace?.status !== nextWorkspace?.status ||
      workspace?.ideUrl !== nextWorkspace?.ideUrl
    ) {
      return true;
    }
    // set the error for the current step
    if (this.state.lastError !== nextState.lastError) {
      return true;
    }
    // propagate main URL
    if (this.state.ideUrl === undefined && nextState.ideUrl) {
      return true;
    }
    return false;
  }

  public componentWillUnmount(): void {
    // clear browsing context
    window.name = '';

    this.toDispose.dispose();
  }

  private handleWorkspaceRestart(): void {
    const workspace = this.findTargetWorkspace(this.props, this.state);
    if (workspace) {
      this.props.deleteWorkspaceLogs(workspace);
    }

    this.stepsList = buildSteps();
    this.setState({
      currentStepIndex: 0,
      ideUrl: undefined,
      lastError: undefined,
      shouldStart: true,
    });
  }

  private handleWorkspaceRestartFromIframe(workspaceId: string): void {
    const workspace = this.findTargetWorkspace(this.props, this.state);
    if (workspace === undefined || workspace.id !== workspaceId) {
      return;
    }

    this.props.deleteWorkspaceLogs(workspace);

    this.stepsList = buildSteps();
    this.setState({
      currentStepIndex: 0,
      ideUrl: undefined,
      lastError: undefined,
      shouldStart: true,
    });
  }

  private handleOpenWorkspacesList(): void {
    // open navigation bar and heading bar
    this.context.showAll();

    const location = buildWorkspacesLocation();
    this.props.history.push(location);
  }

  /**
   * Changes the dashboard layout depending on the provided workspace type
   */
  private setBarsVisibility(isDevWorkspace: boolean | undefined): void {
    if (isDevWorkspace === true) {
      this.context.hideAll();
    } else {
      this.context.showAll();
    }
  }

  private findTargetWorkspace(props: Props, state: State): Workspace | undefined {
    const { allWorkspaces } = props;
    const { matchParams } = state;

    return allWorkspaces.find(
      w => w.name === matchParams.workspaceName && w.namespace === matchParams.namespace,
    );
  }

  private async startLoading(): Promise<void> {
    const { currentStepIndex, matchParams } = this.state;

    const currentStep = this.stepsList.get(currentStepIndex).value;

    try {
      const workspace = this.findTargetWorkspace(this.props, this.state);

      if (!workspace) {
        throw new Error(
          `Workspace "${matchParams.namespace}/${matchParams.workspaceName}" not found.`,
        );
      }

      let nextStepCancellable: CancellablePromise<boolean>;
      if (currentStep.id === IdeLoaderSteps.INITIALIZING) {
        nextStepCancellable = pseudoCancellable(this.runStep1(workspace));
      } else if (currentStep.id === IdeLoaderSteps.START_WORKSPACE) {
        nextStepCancellable = pseudoCancellable(this.runStep2(workspace));
      } else {
        nextStepCancellable = pseudoCancellable(this.startStep3(workspace));
      }
      this.toDispose.push({
        dispose: () => {
          nextStepCancellable.cancel();
        },
      });
      const nextStep = await nextStepCancellable;
      if (nextStep) {
        this.switchToNextStep();
      }
    } catch (e) {
      if (e instanceof Cancellation) {
        // component updated, do nothing
        return;
      }
      currentStep.hasError = true;
      const lastError = common.helpers.errors.getMessage(e);
      this.setState({
        lastError,
      });
    }
  }

  private switchToNextStep(): void {
    const { currentStepIndex } = this.state;
    const currentStep = this.stepsList.get(currentStepIndex);

    if (currentStep.hasNext() === false) {
      return;
    }

    this.setState({
      currentStepIndex: currentStep.next.index,
    });
  }

  /**
   * The resolved boolean indicates whether to go to the next step or not
   */
  private async runStep1(workspace: Workspace): Promise<boolean> {
    if (workspace.isDeprecated) {
      throw new Error(`The workspace is deprecated. Convert the workspace and try again.`);
    }

    if (workspace.status === DevWorkspaceStatus.TERMINATING) {
      throw new Error(`The workspace is terminating and cannot be open.`);
    }

    // if stopping / failing
    if (
      workspace.status === WorkspaceStatus.STOPPING ||
      workspace.status === DevWorkspaceStatus.STOPPING ||
      workspace.status === DevWorkspaceStatus.FAILING
    ) {
      try {
        await new Promise<void>((resolve, reject) => {
          const timeoutId = window.setTimeout(() => {
            reject();
          }, TIMEOUT_TO_STOP_SEC * 1000);

          this.toDispose.push({
            dispose: () => {
              window.clearTimeout(timeoutId);
              resolve();
            },
          });
        });

        // do not switch to the next step
        return false;
      } catch (e) {
        throw new Error(
          `The workspace status remains "${workspace.status}" in the last ${TIMEOUT_TO_STOP_SEC} seconds.`,
        );
      }
    }

    // switch to the next step
    await delay(MIN_STEP_DURATION_MS);
    return true;
  }

  /**
   * The resolved boolean indicates whether to go to the next step or not
   */
  private async runStep2(workspace: Workspace): Promise<boolean> {
    if (
      workspace.status === DevWorkspaceStatus.TERMINATING ||
      workspace.status === WorkspaceStatus.STOPPING ||
      workspace.status === DevWorkspaceStatus.STOPPING ||
      workspace.status === DevWorkspaceStatus.FAILING ||
      (this.state.shouldStart === false &&
        (workspace.status === WorkspaceStatus.STOPPED ||
          workspace.status === WorkspaceStatus.ERROR ||
          workspace.status === DevWorkspaceStatus.STOPPED ||
          workspace.status === DevWorkspaceStatus.FAILED))
    ) {
      const errorLogs = filterErrorLogs(this.props.workspacesLogs, workspace);
      throw new Error(
        errorLogs || `The workspace status changed unexpectedly to "${workspace.status}".`,
      );
    }

    if (workspace.isStarting) {
      try {
        await new Promise<void>((resolve, reject) => {
          const timeoutId = window.setTimeout(() => {
            reject();
          }, TIMEOUT_TO_RUN_SEC * 1000);
          this.toDispose.push({
            dispose: () => {
              window.clearTimeout(timeoutId);
              resolve();
            },
          });
        });

        // do not switch to the next step
        return false;
      } catch (e) {
        throw new Error(
          `The workspace status remains "${workspace.status}" in the last ${TIMEOUT_TO_RUN_SEC} seconds.`,
        );
      }
    }

    // start workspace
    if (
      this.state.shouldStart &&
      (workspace.status === WorkspaceStatus.STOPPED ||
        workspace.status === WorkspaceStatus.ERROR ||
        workspace.status === DevWorkspaceStatus.STOPPED ||
        workspace.status === DevWorkspaceStatus.FAILED)
    ) {
      try {
        await this.props.startWorkspace(workspace);

        // do not switch to the next step
        return false;
      } catch (e) {
        throw new Error(common.helpers.errors.getMessage(e));
      }
    }

    // switch to the next step
    await delay(MIN_STEP_DURATION_MS);
    return true;
  }

  private async startStep3(workspace: Workspace): Promise<false> {
    if (!workspace.isRunning) {
      throw new Error(`The workspace status changed unexpectedly to "${workspace.status}".`);
    }

    if (!workspace.ideUrl) {
      // wait for the IDE url to be set
      try {
        await new Promise<void>((resolve, reject) => {
          const timeoutId = window.setTimeout(() => {
            reject();
          }, TIMEOUT_TO_GET_URL_SEC * 1000);
          this.toDispose.push({
            dispose: () => {
              window.clearTimeout(timeoutId);
              resolve();
            },
          });
        });

        return false;
      } catch (e) {
        throw new Error(
          `The workspace has not received an IDE URL in the last ${TIMEOUT_TO_GET_URL_SEC} seconds. Try to re-open the workspace.`,
        );
      }
    }

    await delay(200);

    this.setState({
      ideUrl: workspace.ideUrl,
    });
    return false;
  }

  render(): React.ReactNode {
    const { currentStepIndex, ideUrl, lastError, matchParams, tabParam } = this.state;
    const workspace = this.findTargetWorkspace(this.props, this.state);

    if (workspace && ideUrl) {
      return (
        <IdeIframe
          ideUrl={ideUrl}
          isDevWorkspace={workspace.isDevWorkspace}
          onOpenWorkspacesList={() => this.handleOpenWorkspacesList()}
          onWorkspaceRestartFromIframe={workspaceId =>
            this.handleWorkspaceRestartFromIframe(workspaceId)
          }
        />
      );
    }

    const steps = this.stepsList.values;
    const currentStepId = this.stepsList.get(currentStepIndex).value.id;

    const alertItem =
      lastError === undefined
        ? undefined
        : {
            key: 'ide-loader-' + getRandomString(4),
            title: 'Failed to open the workspace',
            variant: AlertVariant.danger,
            children: lastError,
          };
    return (
      <IdeLoader
        alertItem={alertItem}
        currentStepId={currentStepId}
        steps={steps}
        tabParam={tabParam}
        matchParams={matchParams}
        workspace={workspace}
        onWorkspaceRestart={() => this.handleWorkspaceRestart()}
      />
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  workspace: selectWorkspaceByUID(state),
  allWorkspaces: selectAllWorkspaces(state),
  isLoading: selectIsLoading(state),
  workspacesLogs: selectLogs(state),
  devworkspacesEnabled: selectDevworkspacesEnabled(state),
});

const connector = connect(mapStateToProps, WorkspaceStore.actionCreators, null, {
  // forwardRef is mandatory for using `@react-mock/state` in unit tests
  forwardRef: true,
});
type MappedProps = ConnectedProps<typeof connector>;
export default connector(IdeLoaderContainer);
