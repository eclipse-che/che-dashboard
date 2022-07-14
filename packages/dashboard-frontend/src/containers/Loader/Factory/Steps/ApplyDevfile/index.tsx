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
import * as WorkspacesStore from '../../../../../store/Workspaces';
import { List, LoaderStep, LoadingStep } from '../../../../../components/Loader/Step';
import { DisposableCollection } from '../../../../../services/helpers/disposable';
import { buildLoaderSteps } from '../../../../../components/Loader/Step/buildSteps';
import { selectAllWorkspaces } from '../../../../../store/Workspaces/selectors';
import { delay } from '../../../../../services/helpers/delay';
import devfileApi from '../../../../../services/devfileApi';
import { FactoryLoaderPage } from '../../../../../pages/Loader/Factory';
import getRandomString from '../../../../../services/helpers/random';
import { selectDefaultNamespace } from '../../../../../store/InfrastructureNamespaces/selectors';
import {
  selectFactoryResolver,
  selectFactoryResolverConverted,
} from '../../../../../store/FactoryResolver/selectors';
import { prepareDevfile } from './prepareDevfile';
import { findTargetWorkspace } from '../findTargetWorkspace';
import { buildIdeLoaderLocation } from '../../../../../services/helpers/location';
import { Workspace } from '../../../../../services/workspace-adapter';
import { MIN_STEP_DURATION_MS, TIMEOUT_TO_CREATE_SEC } from '../../const';
import { FactoryParams } from '../../types';
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

class StepApplyDevfile extends React.Component<Props, State> {
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
    const { factoryResolverConverted } = this.props;
    const { shouldCreate, factoryParams } = this.state;
    const { factoryId, policiesCreate, storageType } = factoryParams;

    const workspace = this.findTargetWorkspace(this.props, this.state);
    if (workspace !== undefined) {
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

    const devfile = factoryResolverConverted?.devfileV2;
    if (devfile === undefined) {
      throw new Error('Failed to resolve the devfile.');
    }

    const updatedDevfile = prepareDevfile(devfile, factoryId, policiesCreate, storageType);

    const { newWorkspaceName } = this.state;
    if (newWorkspaceName !== updatedDevfile.metadata.name) {
      this.setState({
        newWorkspaceName: devfile.metadata.name,
      });
      return false;
    }

    await this.createWorkspaceFromDevfile(updatedDevfile);

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

  private async createWorkspaceFromDevfile(devfile: devfileApi.Devfile): Promise<void> {
    const params = Object.fromEntries(this.props.searchParams);
    const infrastructureNamespace = this.props.defaultNamespace.name;
    const optionalFilesContent = this.props.factoryResolver?.optionalFilesContent || {};
    await this.props.createWorkspaceFromDevfile(
      devfile,
      undefined,
      infrastructureNamespace,
      params,
      optionalFilesContent,
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
  factoryResolver: selectFactoryResolver(state),
  factoryResolverConverted: selectFactoryResolverConverted(state),
});

const connector = connect(mapStateToProps, {
  ...WorkspacesStore.actionCreators,
});
type MappedProps = ConnectedProps<typeof connector>;
export default connector(withRouter(StepApplyDevfile));
