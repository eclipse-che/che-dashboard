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
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { Cancellation, pseudoCancellable } from 'real-cancellable-promise';
import common from '@eclipse-che/common';
import { AlertVariant } from '@patternfly/react-core';
import { AppState } from '../../../../../store';
import * as FactoryResolverStore from '../../../../../store/FactoryResolver';
import * as WorkspacesStore from '../../../../../store/Workspaces';
import * as DevWorkspacesStore from '../../../../../store/Workspaces/devWorkspaces';
import * as DevfileRegistriesStore from '../../../../../store/DevfileRegistries';
import { List, LoaderStep, LoadingStep } from '../../../../../components/Loader/Step';
import { DisposableCollection } from '../../../../../services/helpers/disposable';
import { buildLoaderSteps } from '../../../../../components/Loader/Step/buildSteps';
import { selectAllWorkspaces } from '../../../../../store/Workspaces/selectors';
import { selectDevworkspacesEnabled } from '../../../../../store/Workspaces/Settings/selectors';
import { delay } from '../../../../../services/helpers/delay';
import { FactoryLoaderPage } from '../../../../../pages/Loader/Factory';
import getRandomString from '../../../../../services/helpers/random';
import {
  selectDefaultNamespace,
  selectInfrastructureNamespaces,
} from '../../../../../store/InfrastructureNamespaces/selectors';
import {
  selectFactoryResolver,
  selectFactoryResolverConverted,
} from '../../../../../store/FactoryResolver/selectors';
import { prepareResources } from './prepareResources';
import { findTargetWorkspace } from '../findTargetWorkspace';
import { selectDevWorkspaceResources } from '../../../../../store/DevfileRegistries/selectors';
import { buildIdeLoaderLocation } from '../../../../../services/helpers/location';
import { Workspace } from '../../../../../services/workspace-adapter';
import { FactoryParams } from '../../types';
import { MIN_STEP_DURATION_MS, TIMEOUT_TO_CREATE_SEC } from '../../const';
import buildFactoryParams from '../../buildFactoryParams';

export type Props = MappedProps &
  RouteComponentProps & {
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
  newWorkspaceName?: string;
  shouldCreate: boolean; // should the loader create a workspace
};

class StepApplyResources extends React.Component<Props, State> {
  private readonly toDispose = new DisposableCollection();
  private stepsList: List<LoaderStep>;

  constructor(props: Props) {
    super(props);

    this.state = {
      factoryParams: buildFactoryParams(props.searchParams),
      shouldCreate: true,
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

    // new workspace appeared
    if (workspace === undefined && nextWorkspace !== undefined) {
      return true;
    }

    // current step failed
    if (this.state.lastError !== nextState.lastError) {
      return true;
    }

    if (this.state.shouldCreate !== nextState.shouldCreate) {
      return true;
    }

    if (this.state.newWorkspaceName !== nextState.newWorkspaceName) {
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
      // prevent a workspace being created one more time
      this.setState({
        shouldCreate: false,
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
    const { factoryParams, shouldCreate } = this.state;
    const { cheEditor, factoryId, sourceUrl, storageType } = factoryParams;

    const workspace = this.findTargetWorkspace(this.props, this.state);
    if (workspace) {
      // the workspace has been created, go to the next step
      await delay(MIN_STEP_DURATION_MS);

      const nextLocation = buildIdeLoaderLocation(workspace);
      this.props.location.pathname = nextLocation.pathname;
      this.props.location.search = '';
      return true;
    }

    if (shouldCreate === false) {
      throw new Error(this.state.lastError || 'The workspace creation unexpectedly failed.');
    }

    const resources = devWorkspaceResources[sourceUrl]?.resources;
    if (resources === undefined) {
      throw new Error('Failed to fetch devworkspace resources.');
    }

    // create a workspace using pre-generated resources
    const [devWorkspace, devWorkspaceTemplate] = prepareResources(
      resources,
      factoryId,
      storageType,
    );

    const { newWorkspaceName } = this.state;
    if (newWorkspaceName !== devWorkspace.metadata.name) {
      this.setState({
        newWorkspaceName: devWorkspace.metadata.name,
      });
      return false;
    }

    await this.props.createWorkspaceFromResources(devWorkspace, devWorkspaceTemplate, cheEditor);

    // wait for the workspace creation to complete
    try {
      await this.waitForStepDone(TIMEOUT_TO_CREATE_SEC);

      // do not switch to the next step
      return false;
    } catch (e) {
      throw new Error(
        `Workspace hasn't been created in the last ${TIMEOUT_TO_CREATE_SEC} seconds.`,
      );
    }
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

  private findTargetWorkspace(props: Props, state: State): Workspace | undefined {
    return findTargetWorkspace(
      props.allWorkspaces,
      state.factoryParams.factoryId,
      state.factoryParams.policiesCreate,
      state.newWorkspaceName,
    );
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
            key: 'factory-loader-' + getRandomString(4),
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
  defaultNamespace: selectDefaultNamespace(state),
  devworkspacesEnabled: selectDevworkspacesEnabled(state),
  factoryResolver: selectFactoryResolver(state),
  factoryResolverConverted: selectFactoryResolverConverted(state),
  infrastructureNamespaces: selectInfrastructureNamespaces(state),
  devWorkspaceResources: selectDevWorkspaceResources(state),
});

const connector = connect(mapStateToProps, {
  ...DevfileRegistriesStore.actionCreators,
  ...FactoryResolverStore.actionCreators,
  ...WorkspacesStore.actionCreators,
  createWorkspaceFromResources: DevWorkspacesStore.actionCreators.createWorkspaceFromResources,
});
type MappedProps = ConnectedProps<typeof connector>;
export default connector(withRouter(StepApplyResources));
