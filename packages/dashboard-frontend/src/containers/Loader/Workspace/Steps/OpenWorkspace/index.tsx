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
import { Cancellation, pseudoCancellable } from 'real-cancellable-promise';
import { AlertVariant } from '@patternfly/react-core';
import common from '@eclipse-che/common';
import { AppState } from '../../../../../store';
import { selectAllWorkspaces } from '../../../../../store/Workspaces/selectors';
import * as WorkspaceStore from '../../../../../store/Workspaces';
import { LoadingStep, List, LoaderStep } from '../../../../../components/Loader/Step';
import { buildLoaderSteps } from '../../../../../components/Loader/Step/buildSteps';
import { WorkspaceLoaderPage } from '../../../../../pages/Loader/Workspace';
import { DisposableCollection } from '../../../../../services/helpers/disposable';
import { delay } from '../../../../../services/helpers/delay';
import { MIN_STEP_DURATION_MS, TIMEOUT_TO_GET_URL_SEC } from '../..';
import findTargetWorkspace from '../../findTargetWorkspace';
import { Workspace } from '../../../../../services/workspace-adapter';

export type Props = MappedProps & {
  currentStepIndex: number; // not ID, but index
  loadingSteps: LoadingStep[];
  matchParams: {
    namespace: string;
    workspaceName: string;
  };
  tabParam: string | undefined;
  onNextStep: () => void;
  onRestart: () => void;
};
export type State = {
  lastError?: string;
};

class StepOpenWorkspace extends React.Component<Props, State> {
  private readonly toDispose = new DisposableCollection();
  private stepsList: List<LoaderStep>;

  constructor(props: Props) {
    super(props);

    this.stepsList = buildLoaderSteps(this.props.loadingSteps);

    this.state = {};
  }

  public componentDidMount() {
    this.prepareAndRun();
  }

  public async componentDidUpdate() {
    this.toDispose.dispose();

    this.prepareAndRun();
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
    if (this.state.lastError !== nextState.lastError) {
      return true;
    }
    return false;
  }

  public componentWillUnmount(): void {
    this.toDispose.dispose();
  }

  private handleWorkspaceRestart(): void {
    this.props.onRestart();
  }

  private async prepareAndRun(): Promise<void> {
    const { currentStepIndex } = this.props;

    const currentStep = this.stepsList.get(currentStepIndex).value;

    try {
      const stepCancellablePromise = pseudoCancellable(this.runStep());
      this.toDispose.push({
        dispose: () => {
          stepCancellablePromise.cancel();
        },
      });
      const jumpToNextStep = await stepCancellablePromise;
      if (jumpToNextStep) {
        this.props.onNextStep();
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

  private async runStep(): Promise<boolean> {
    const { matchParams } = this.props;

    const workspace = this.findTargetWorkspace(this.props);

    if (!workspace) {
      throw new Error(
        `Workspace "${matchParams.namespace}/${matchParams.workspaceName}" not found.`,
      );
    }

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

    await delay(MIN_STEP_DURATION_MS);

    window.location.replace(workspace.ideUrl);

    return true;
  }

  private findTargetWorkspace(props: Props): Workspace | undefined {
    return findTargetWorkspace(props.allWorkspaces, props.matchParams);
  }

  render(): React.ReactNode {
    const { currentStepIndex, tabParam } = this.props;
    const { lastError } = this.state;
    const workspace = this.findTargetWorkspace(this.props);

    const steps = this.stepsList.values;
    const currentStepId = this.stepsList.get(currentStepIndex).value.id;

    const alertItem =
      lastError === undefined
        ? undefined
        : {
            key: 'ide-loader-open-ide',
            title: 'Failed to open the workspace',
            variant: AlertVariant.danger,
            children: lastError,
          };

    return (
      <WorkspaceLoaderPage
        alertItem={alertItem}
        currentStepId={currentStepId}
        steps={steps}
        tabParam={tabParam}
        workspace={workspace}
        onRestart={() => this.handleWorkspaceRestart()}
      />
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  allWorkspaces: selectAllWorkspaces(state),
});

const connector = connect(mapStateToProps, WorkspaceStore.actionCreators, null, {
  // forwardRef is mandatory for using `@react-mock/state` in unit tests
  forwardRef: true,
});
type MappedProps = ConnectedProps<typeof connector>;
export default connector(StepOpenWorkspace);
