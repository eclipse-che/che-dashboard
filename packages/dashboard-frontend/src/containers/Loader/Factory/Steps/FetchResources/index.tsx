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
import common from '@eclipse-che/common';
import { AlertVariant } from '@patternfly/react-core';
import { AppState } from '../../../../../store';
import * as DevfileRegistriesStore from '../../../../../store/DevfileRegistries';
import { List, LoaderStep, LoadingStep } from '../../../../../components/Loader/Step';
import { DisposableCollection } from '../../../../../services/helpers/disposable';
import { buildLoaderSteps } from '../../../../../components/Loader/Step/buildSteps';
import { selectAllWorkspaces } from '../../../../../store/Workspaces/selectors';
import { delay } from '../../../../../services/helpers/delay';
import { FactoryLoaderPage } from '../../../../../pages/Loader/Factory';
import { findTargetWorkspace } from '../findTargetWorkspace';
import { selectDevWorkspaceResources } from '../../../../../store/DevfileRegistries/selectors';
import { Workspace } from '../../../../../services/workspace-adapter';
import { FactoryParams } from '../../types';
import { MIN_STEP_DURATION_MS, TIMEOUT_TO_RESOLVE_SEC } from '../../const';
import buildFactoryParams from '../../buildFactoryParams';

export type Props = MappedProps & {
  currentStepIndex: number;
  loadingSteps: LoadingStep[];
  searchParams: URLSearchParams;
  tabParam: string | undefined;
  onNextStep: () => void;
  onRestart: () => void;
};
export type State = {
  factoryParams: FactoryParams;
  lastError?: string;
  shouldResolve: boolean; // should the loader resolve resources
};

class StepFetchResources extends React.Component<Props, State> {
  private readonly toDispose = new DisposableCollection();
  private stepsList: List<LoaderStep>;

  constructor(props: Props) {
    super(props);

    this.state = {
      factoryParams: buildFactoryParams(props.searchParams),
      shouldResolve: true,
    };

    this.stepsList = buildLoaderSteps(this.props.loadingSteps);
  }

  public componentDidMount() {
    this.init();
  }

  public componentDidUpdate() {
    this.toDispose.dispose();

    this.init();
  }

  public shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    const workspace = this.findTargetWorkspace(this.props, this.state);
    const nextWorkspace = this.findTargetWorkspace(nextProps, nextState);

    // switch to the next step
    if (this.props.currentStepIndex !== nextProps.currentStepIndex) {
      return true;
    }

    // factory resolver got updated
    const { sourceUrl } = this.state.factoryParams;
    // devworkspace resources fetched
    if (
      sourceUrl &&
      this.props.devWorkspaceResources[sourceUrl]?.resources === undefined &&
      nextProps.devWorkspaceResources[sourceUrl]?.resources !== undefined
    ) {
      return true;
    }

    // new workspace appeared
    if (workspace === undefined && nextWorkspace !== undefined) {
      return true;
    }

    // current step failed
    if (this.state.lastError !== nextState.lastError) {
      return true;
    }

    if (this.state.shouldResolve !== nextState.shouldResolve) {
      return true;
    }
    return false;
  }

  public componentWillUnmount(): void {
    this.toDispose.dispose();
  }

  private init() {
    const workspace = this.findTargetWorkspace(this.props, this.state);
    if (workspace) {
      // prevent a resource being fetched one more time
      this.setState({
        shouldResolve: false,
      });
    }

    const { devWorkspaceResources } = this.props;
    const { factoryParams } = this.state;
    const { sourceUrl } = factoryParams;
    if (sourceUrl && devWorkspaceResources[sourceUrl]?.resources !== undefined) {
      this.setState({
        shouldResolve: false,
      });
    }

    this.prepareAndRun();
  }

  private async prepareAndRun(): Promise<void> {
    const { currentStepIndex } = this.props;

    const currentStep = this.stepsList.get(currentStepIndex).value;

    try {
      const nextStepCancellable = pseudoCancellable(this.runStep());
      this.toDispose.push({
        dispose: () => {
          nextStepCancellable.cancel();
        },
      });
      const nextStep = await nextStepCancellable;
      if (nextStep) {
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
    const { devWorkspaceResources } = this.props;
    const { factoryParams, lastError, shouldResolve } = this.state;
    const { sourceUrl } = factoryParams;

    const workspace = this.findTargetWorkspace(this.props, this.state);
    if (workspace) {
      // the workspace has been created, go to the next step
      await delay(MIN_STEP_DURATION_MS);
      return true;
    }

    if (devWorkspaceResources[sourceUrl]) {
      // pre-built resources fetched successfully
      await delay(MIN_STEP_DURATION_MS);
      return true;
    }

    if (shouldResolve === false) {
      throw new Error(lastError || 'Failed to fetch pre-built resources');
    }

    await this.props.requestResources(sourceUrl);

    // wait for fetching resources to complete
    try {
      await this.waitForStepDone(TIMEOUT_TO_RESOLVE_SEC);

      // do not switch to the next step
      return false;
    } catch (e) {
      throw new Error(
        `Pre-built resources haven't been fetched in the last ${TIMEOUT_TO_RESOLVE_SEC} seconds.`,
      );
    }
  }

  private findTargetWorkspace(props: Props, state: State): Workspace | undefined {
    return findTargetWorkspace(
      props.allWorkspaces,
      state.factoryParams.factoryId,
      state.factoryParams.policiesCreate,
    );
  }

  private async waitForStepDone(seconds: number): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject();
      }, seconds * 1000);

      this.toDispose.push({
        dispose: () => {
          window.clearTimeout(timeoutId);
          resolve();
        },
      });
    });
  }

  private handleFactoryReload(): void {
    this.props.onRestart();
  }

  render(): React.ReactElement {
    const { currentStepIndex, tabParam } = this.props;
    const { lastError } = this.state;

    const steps = this.stepsList.values;
    const currentStepId = this.stepsList.get(currentStepIndex).value.id;

    const alertItem =
      lastError === undefined
        ? undefined
        : {
            key: 'factory-loader-fetch-resources',
            title: 'Failed to create the workspace',
            variant: AlertVariant.danger,
            children: lastError,
          };

    return (
      <FactoryLoaderPage
        alertItem={alertItem}
        currentStepId={currentStepId}
        steps={steps}
        tabParam={tabParam}
        onRestart={() => this.handleFactoryReload()}
      />
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  allWorkspaces: selectAllWorkspaces(state),
  devWorkspaceResources: selectDevWorkspaceResources(state),
});

const connector = connect(mapStateToProps, {
  ...DevfileRegistriesStore.actionCreators,
});
type MappedProps = ConnectedProps<typeof connector>;
export default connector(StepFetchResources);
