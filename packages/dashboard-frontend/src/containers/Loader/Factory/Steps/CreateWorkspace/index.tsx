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
import { Cancellation, pseudoCancellable } from 'real-cancellable-promise';
import common from '@eclipse-che/common';
import { AlertVariant } from '@patternfly/react-core';
import { List, LoaderStep, LoadingStep } from '../../../../../components/Loader/Step';
import { DisposableCollection } from '../../../../../services/helpers/disposable';
import { buildLoaderSteps } from '../../../../../components/Loader/Step/buildSteps';
import { delay } from '../../../../../services/helpers/delay';
import { FactoryLoaderPage } from '../../../../../pages/Loader/Factory';
import getRandomString from '../../../../../services/helpers/random';
import { MIN_STEP_DURATION_MS } from '../../const';

export type Props = {
  currentStepIndex: number;
  loadingSteps: LoadingStep[];
  searchParams: URLSearchParams;
  tabParam: string | undefined;
  onNextStep: () => void;
  onRestart: () => void;
};
export type State = {
  lastError?: string;
};

export default class StepCreateWorkspace extends React.PureComponent<Props, State> {
  private readonly toDispose = new DisposableCollection();
  private stepsList: List<LoaderStep>;

  constructor(props: Props) {
    super(props);

    this.state = {};

    this.stepsList = buildLoaderSteps(this.props.loadingSteps);
  }

  public componentDidMount() {
    this.prepareAndRun();
  }

  public componentDidUpdate() {
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
    await delay(MIN_STEP_DURATION_MS);
    return true;
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
