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
import { matchPath, RouteComponentProps } from 'react-router-dom';
import { ROUTE, WorkspaceParams } from '../../Routes/routes';
import { List, LoadingStep } from '../../components/Loader/Step';
import {
  FactorySource,
  getFactoryLoadingSteps,
  getIdeLoadingSteps,
} from '../../components/Loader/Step/buildSteps';
import FactoryLoaderContainer from './Factory';
import { DEV_WORKSPACE_ATTR } from './Factory/const';
import WorkspaceLoader from './Workspace';
import { connect, ConnectedProps } from 'react-redux';

type FactoryMode = 'factory';
type IdeMode = 'ide';
type LoaderMode = FactoryMode | IdeMode;

export type Props = MappedProps & RouteComponentProps;
export type State = {
  currentStepIndex: number;
  tabParam: string | undefined;
  searchParams: URLSearchParams;
};

/**
 * todo describe how loader works
 */
class LoaderContainer extends React.Component<Props, State> {
  private readonly steps: LoadingStep[];
  private readonly stepsList: List<LoadingStep>;

  constructor(props: Props) {
    super(props);

    const searchParams = new URLSearchParams(this.props.history.location.search);
    const tabParam = searchParams.get('tab') || undefined;

    const { mode } = this.getMode(props);
    if (mode === 'ide') {
      this.steps = getIdeLoadingSteps();
    } else {
      const factorySource: FactorySource = searchParams.has(DEV_WORKSPACE_ATTR)
        ? 'devworkspace'
        : 'devfile';
      this.steps = getFactoryLoadingSteps(factorySource);
    }
    this.stepsList = new List();
    this.steps.forEach(step => this.stepsList.add(step));

    this.state = {
      currentStepIndex: 0,
      tabParam,
      searchParams,
    };
  }

  private getMode(props: Props): {
    mode: LoaderMode;
    ideLoaderParams?: WorkspaceParams;
  } {
    const matchIdeLoaderPath = matchPath<WorkspaceParams>(props.history.location.pathname, {
      path: ROUTE.IDE_LOADER,
      exact: true,
    });
    if (matchIdeLoaderPath) {
      return { mode: 'ide', ideLoaderParams: matchIdeLoaderPath.params };
    } else {
      return { mode: 'factory' };
    }
  }

  private handleNextStep(): void {
    const { currentStepIndex } = this.state;
    const currentStep = this.stepsList.get(currentStepIndex);

    if (currentStep.hasNext() === false) {
      return;
    }

    this.setState({
      currentStepIndex: currentStep.next.index,
    });
  }

  private handleRestart(): void {
    this.props.history.go(0);
  }

  render(): React.ReactElement {
    const { currentStepIndex, tabParam, searchParams } = this.state;

    const { mode, ideLoaderParams } = this.getMode(this.props);
    if (mode === 'factory') {
      return (
        <FactoryLoaderContainer
          currentStepIndex={currentStepIndex}
          loadingSteps={this.stepsList.values}
          searchParams={searchParams}
          tabParam={tabParam}
          onNextStep={() => this.handleNextStep()}
          onRestart={() => this.handleRestart()}
        />
      );
    } else {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const matchParams = ideLoaderParams!;
      return (
        <WorkspaceLoader
          currentStepIndex={currentStepIndex}
          loadingSteps={this.stepsList.values}
          matchParams={matchParams}
          tabParam={tabParam}
          onNextStep={() => this.handleNextStep()}
          onRestart={() => this.handleRestart()}
        />
      );
    }
  }
}

const connector = connect(null, null, null, {
  // forwardRef is mandatory for using `@react-mock/state` in unit tests
  forwardRef: true,
});
type MappedProps = ConnectedProps<typeof connector>;
export default connector(LoaderContainer);
