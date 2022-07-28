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

import common from '@eclipse-che/common';
import React from 'react';
import { Cancellation, pseudoCancellable } from 'real-cancellable-promise';
import { List, LoaderStep, LoadingStep } from '../../components/Loader/Step';
import { DisposableCollection } from '../../services/helpers/disposable';

export type LoaderStepProps = {
  currentStepIndex: number;
  loadingSteps: LoadingStep[];
  tabParam: string | undefined;
  onNextStep: () => void;
  onRestart: () => void;
};
export type LoaderStepState = {
  lastError?: string;
};
export abstract class AbstractLoaderStep<
  P extends LoaderStepProps,
  S extends LoaderStepState,
> extends React.Component<P, S> {
  protected readonly toDispose: DisposableCollection;
  protected readonly stepsList: List<LoaderStep>;

  protected abstract runStep(): Promise<boolean>;

  protected async prepareAndRun(): Promise<void> {
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
      this.setStepError(e);
    }
  }

  protected handleRestart(): void {
    this.clearStepError();
    this.props.onRestart();
  }

  protected setStepError(e: unknown) {
    const { currentStepIndex } = this.props;
    const currentStep = this.stepsList.get(currentStepIndex).value;

    currentStep.hasError = true;
    const lastError = common.helpers.errors.getMessage(e);
    this.setState({
      lastError,
    });
  }

  protected clearStepError() {
    const { currentStepIndex } = this.props;
    const currentStep = this.stepsList.get(currentStepIndex).value;

    currentStep.hasError = false;
    this.setState({
      lastError: undefined,
    });
  }

  protected async waitForStepDone(seconds: number): Promise<void> {
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
}
