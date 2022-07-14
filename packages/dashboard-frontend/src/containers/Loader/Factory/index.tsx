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
import { LoadingStep } from '../../../components/Loader/Step';
import StepInitialize from './Steps/Initialize';
import StepCreateWorkspace from './Steps/CreateWorkspace';
import StepFetchDevfile from './Steps/FetchDevfile';
import StepFetchResources from './Steps/FetchResources';
import StepApplyDevfile from './Steps/ApplyDevfile';
import StepApplyResources from './Steps/ApplyResources';

export type Props = {
  currentStepIndex: number;
  loadingSteps: LoadingStep[];
  searchParams: URLSearchParams;
  tabParam: string | undefined;
  onNextStep: () => void;
  onRestart: () => void;
};

export default class FactoryLoader extends React.Component<Props> {
  render(): React.ReactElement {
    const { currentStepIndex, loadingSteps } = this.props;

    switch (loadingSteps[currentStepIndex]) {
      case LoadingStep.CREATE_WORKSPACE:
        return <StepCreateWorkspace {...this.props} />;
      case LoadingStep.CREATE_WORKSPACE__FETCH_DEVFILE:
        return <StepFetchDevfile {...this.props} />;
      case LoadingStep.CREATE_WORKSPACE__FETCH_RESOURCES:
        return <StepFetchResources {...this.props} />;
      case LoadingStep.CREATE_WORKSPACE__APPLY_DEVFILE:
        return <StepApplyDevfile {...this.props} />;
      case LoadingStep.CREATE_WORKSPACE__APPLY_RESOURCES:
        return <StepApplyResources {...this.props} />;
      default:
        return <StepInitialize {...this.props} />;
    }
  }
}
