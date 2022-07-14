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
import { generatePath } from 'react-router-dom';
import { Cancellation, pseudoCancellable } from 'real-cancellable-promise';
import common from '@eclipse-che/common';
import { AlertVariant } from '@patternfly/react-core';
import { AppState } from '../../../../../store';
import { selectInfrastructureNamespaces } from '../../../../../store/InfrastructureNamespaces/selectors';
import { List, LoaderStep, LoadingStep } from '../../../../../components/Loader/Step';
import { buildLoaderSteps } from '../../../../../components/Loader/Step/buildSteps';
import { DisposableCollection } from '../../../../../services/helpers/disposable';
import { delay } from '../../../../../services/helpers/delay';
import { ROUTE } from '../../../../../Routes/routes';
import { FactoryLoaderPage } from '../../../../../pages/Loader/Factory';
import { FactoryParams, PoliciesCreate } from '../../types';
import { MIN_STEP_DURATION_MS } from '../../const';
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
};

class StepInitialize extends React.Component<Props, State> {
  private readonly toDispose = new DisposableCollection();
  private stepsList: List<LoaderStep>;

  constructor(props: Props) {
    super(props);

    this.state = {
      factoryParams: buildFactoryParams(props.searchParams),
    };

    this.stepsList = buildLoaderSteps(this.props.loadingSteps);
  }

  public componentDidMount() {
    this.prepareAndRun();
  }

  public componentDidUpdate() {
    this.toDispose.dispose();
    this.prepareAndRun();
  }

  public shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    // switch to the next step
    if (this.props.currentStepIndex !== nextProps.currentStepIndex) {
      return true;
    }

    // current step failed
    if (this.state.lastError !== nextState.lastError) {
      return true;
    }

    return false;
  }

  public componentWillUnmount(): void {
    this.toDispose.dispose();
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
    const { useDevworkspaceResources, sourceUrl, errorCode, policiesCreate } =
      this.state.factoryParams;

    if (useDevworkspaceResources === true && sourceUrl === '') {
      throw new Error('Devworkspace resources URL is missing.');
    } else if (useDevworkspaceResources === false && sourceUrl === '') {
      const factoryPath = generatePath(ROUTE.FACTORY_LOADER_URL, {
        url: 'your-repository-url',
      });
      throw new Error(
        `Repository/Devfile URL is missing. Please specify it via url query param: ${window.location.origin}${window.location.pathname}#${factoryPath}`,
      );
    }

    // find error codes
    if (errorCode === 'invalid_request') {
      throw new Error(
        'Could not resolve devfile from private repository because authentication request is missing a parameter, contains an invalid parameter, includes a parameter more than once, or is otherwise invalid.',
      );
    }
    if (errorCode === 'access_denied') {
      throw new Error(
        'Could not resolve devfile from private repository because the user or authorization server denied the authentication request.',
      );
    }

    // validate creation policies
    if (this.isCreatePolicy(policiesCreate) === false) {
      throw new Error(
        `Unsupported create policy '${policiesCreate}' is specified while the only following are supported: peruser, perclick. Please fix 'policies.create' parameter and try again.`,
      );
    }

    // check for a pre-created infrastructure namespace
    const namespaces = this.props.infrastructureNamespaces;
    if (namespaces.length === 0 || (namespaces.length === 1 && !namespaces[0].attributes.phase)) {
      throw new Error(
        'Failed to accept the factory URL. The infrastructure namespace is required to be created. Please create a regular workspace to workaround the issue and open factory URL again.',
      );
    }

    await delay(MIN_STEP_DURATION_MS);

    return true;
  }

  private isCreatePolicy(val: string): val is PoliciesCreate {
    return (val && (val as PoliciesCreate) === 'perclick') || (val as PoliciesCreate) === 'peruser';
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
            key: 'factory-loader-initialize',
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
  infrastructureNamespaces: selectInfrastructureNamespaces(state),
});

const connector = connect(mapStateToProps, {});
type MappedProps = ConnectedProps<typeof connector>;
export default connector(StepInitialize);
