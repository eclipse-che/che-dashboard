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
import { Props } from '..';
import { LoadingStep } from '../../../../components/Loader/Step';

export default class FactoryLoaderContainer extends React.Component<Props> {
  public render(): React.ReactNode {
    const { currentStepIndex, loadingSteps, onNextStep, onRestart } = this.props;
    const steps = loadingSteps.map(step => (
      <div key={LoadingStep[step]} data-testid={LoadingStep[step]}>
        {LoadingStep[step]}
      </div>
    ));
    return (
      <div data-testid="factory-loader-container">
        <button data-testid="on-next-step" onClick={() => onNextStep()}>
          onNextStep
        </button>
        <button data-testid="on-restart" onClick={() => onRestart()}>
          onRestart
        </button>
        <div data-testid="current-step-index">{currentStepIndex}</div>
        <div>{steps}</div>
      </div>
    );
  }
}
