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
import { connect, ConnectedProps } from 'react-redux';
import { AlertVariant } from '@patternfly/react-core';
import common from '@eclipse-che/common';
import { isEqual } from 'lodash';
import { AppState } from '../../../../../store';
import { selectAllWorkspaces, selectLogs } from '../../../../../store/Workspaces/selectors';
import * as WorkspaceStore from '../../../../../store/Workspaces';
import WorkspaceLoaderPage from '../../../../../pages/Loader/Workspace';
import { AlertItem, DevWorkspaceStatus, LoaderTab } from '../../../../../services/helpers/types';
import { DisposableCollection } from '../../../../../services/helpers/disposable';
import { delay } from '../../../../../services/helpers/delay';
import { filterErrorLogs } from '../../../../../services/helpers/filterErrorLogs';
import { MIN_STEP_DURATION_MS, TIMEOUT_TO_RUN_SEC } from '../../../const';
import findTargetWorkspace from '../../../findTargetWorkspace';
import workspaceStatusIs from '../workspaceStatusIs';
import { Workspace } from '../../../../../services/workspace-adapter';
import { AbstractLoaderStep, LoaderStepProps, LoaderStepState } from '../../../AbstractStep';

export type Props = MappedProps &
  LoaderStepProps & {
    matchParams: {
      namespace: string;
      workspaceName: string;
    };
  };
export type State = LoaderStepState & {
  shouldStart: boolean; // should the loader start a workspace?
};

class StepStartWorkspace extends AbstractLoaderStep<Props, State> {
  protected readonly toDispose = new DisposableCollection();

  constructor(props: Props) {
    super(props);

    this.state = {
      shouldStart: true,
    };
  }

  public componentDidMount() {
    this.init();
  }

  public async componentDidUpdate() {
    this.toDispose.dispose();

    this.init();
  }

  public shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    const workspace = this.findTargetWorkspace(this.props);
    const nextWorkspace = this.findTargetWorkspace(nextProps);

    // next step
    if (nextProps.currentStepIndex > this.props.currentStepIndex) {
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
    if (!isEqual(this.state.lastError, nextState.lastError)) {
      return true;
    }
    return false;
  }

  public componentWillUnmount(): void {
    this.toDispose.dispose();
  }

  private init() {
    const workspace = this.findTargetWorkspace(this.props);
    if ((workspace?.isStarting || workspace?.isRunning) && this.state.shouldStart) {
      // prevent a workspace being repeatedly restarted, once it's starting
      this.setState({
        shouldStart: false,
      });
    }

    this.prepareAndRun();
  }

  protected handleRestart(tabName?: string): void {
    this.setState({ shouldStart: true });
    this.clearStepError();
    this.props.onRestart(tabName);
  }

  /**
   * The resolved boolean indicates whether to go to the next step or not
   */
  protected async runStep(): Promise<boolean> {
    await delay(MIN_STEP_DURATION_MS);

    const { matchParams } = this.props;

    const workspace = this.findTargetWorkspace(this.props);

    if (!workspace) {
      throw new Error(
        `Workspace "${matchParams.namespace}/${matchParams.workspaceName}" not found.`,
      );
    }

    if (
      workspaceStatusIs(
        workspace,
        DevWorkspaceStatus.TERMINATING,
        DevWorkspaceStatus.STOPPING,
        DevWorkspaceStatus.FAILING,
      ) ||
      (this.state.shouldStart === false &&
        workspaceStatusIs(workspace, DevWorkspaceStatus.STOPPED, DevWorkspaceStatus.FAILED))
    ) {
      const errorLogs = filterErrorLogs(this.props.workspacesLogs, workspace).pop();
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
      workspaceStatusIs(workspace, DevWorkspaceStatus.STOPPED, DevWorkspaceStatus.FAILED)
    ) {
      await this.props.startWorkspace(workspace);
      // do not switch to the next step
      return false;
    }

    // switch to the next step
    return true;
  }

  protected findTargetWorkspace(props: Props): Workspace | undefined {
    return findTargetWorkspace(props.allWorkspaces, props.matchParams);
  }

  private getAlertItem(error: unknown): AlertItem | undefined {
    if (!error) {
      return;
    }
    return {
      key: 'ide-loader-start-workspace',
      title: 'Failed to open the workspace',
      variant: AlertVariant.danger,
      children: common.helpers.errors.getMessage(error),
      actionCallbacks: [
        {
          title: 'Restart',
          callback: () => this.handleRestart(),
        },
        {
          title: 'Open in Verbose mode',
          callback: () => this.handleRestart(LoaderTab[LoaderTab.Logs]),
        },
      ],
    };
  }

  render(): React.ReactNode {
    const { currentStepIndex, loaderSteps, tabParam } = this.props;
    const { lastError } = this.state;
    const workspace = this.findTargetWorkspace(this.props);

    const steps = loaderSteps.values;
    const currentStepId = loaderSteps.get(currentStepIndex).value.id;

    const alertItem = this.getAlertItem(lastError);

    return (
      <WorkspaceLoaderPage
        alertItem={alertItem}
        currentStepId={currentStepId}
        steps={steps}
        tabParam={tabParam}
        workspace={workspace}
      />
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  allWorkspaces: selectAllWorkspaces(state),
  workspacesLogs: selectLogs(state),
});

const connector = connect(mapStateToProps, WorkspaceStore.actionCreators, null, {
  // forwardRef is mandatory for using `@react-mock/state` in unit tests
  forwardRef: true,
});
type MappedProps = ConnectedProps<typeof connector>;
export default connector(StepStartWorkspace);
