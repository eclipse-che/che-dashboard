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
import { AppState } from '../../../../../store';
import { selectAllWorkspaces } from '../../../../../store/Workspaces/selectors';
import * as WorkspaceStore from '../../../../../store/Workspaces';
import { List, LoaderStep } from '../../../../../components/Loader/Step';
import { buildLoaderSteps } from '../../../../../components/Loader/Step/buildSteps';
import { WorkspaceLoaderPage } from '../../../../../pages/Loader/Workspace';
import { Workspace } from '../../../../../services/workspace-adapter';
import { DevWorkspaceStatus } from '../../../../../services/helpers/types';
import { DisposableCollection } from '../../../../../services/helpers/disposable';
import { delay } from '../../../../../services/helpers/delay';
import { MIN_STEP_DURATION_MS, TIMEOUT_TO_STOP_SEC } from '../consts';
import findTargetWorkspace from '../../findTargetWorkspace';
import { AbstractLoaderStep, LoaderStepProps, LoaderStepState } from '../../../AbstractStep';

export type Props = MappedProps &
  LoaderStepProps & {
    matchParams: {
      namespace: string;
      workspaceName: string;
    };
  };
export type State = LoaderStepState;

class StepInitialize extends AbstractLoaderStep<Props, State> {
  protected readonly toDispose = new DisposableCollection();
  protected stepsList: List<LoaderStep>;

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

  private isWorkspaceStatus(workspace: Workspace, ...statuses: DevWorkspaceStatus[]): boolean {
    return statuses.some(status => status === workspace.status);
  }

  /**
   * The resolved boolean indicates whether to go to the next step or not
   */
  protected async runStep(): Promise<boolean> {
    const { matchParams } = this.props;
    const workspace = this.findTargetWorkspace(this.props);

    if (!workspace) {
      throw new Error(
        `Workspace "${matchParams.namespace}/${matchParams.workspaceName}" not found.`,
      );
    }

    if (workspace.isDeprecated) {
      throw new Error(`The workspace is deprecated. Convert the workspace and try again.`);
    }

    if (this.isWorkspaceStatus(workspace, DevWorkspaceStatus.TERMINATING)) {
      throw new Error(`The workspace is terminating and cannot be open.`);
    }

    // if stopping / failing
    if (
      this.isWorkspaceStatus(workspace, DevWorkspaceStatus.STOPPING, DevWorkspaceStatus.FAILING)
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

  protected findTargetWorkspace(props: Props): Workspace | undefined {
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
            key: 'ide-loader-initialize',
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
        onRestart={() => this.handleRestart()}
      />
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  allWorkspaces: selectAllWorkspaces(state),
});

const connector = connect(mapStateToProps, WorkspaceStore.actionCreators);
type MappedProps = ConnectedProps<typeof connector>;
export default connector(StepInitialize);
