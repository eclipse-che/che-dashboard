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
import { isEqual } from 'lodash';
import { AlertVariant } from '@patternfly/react-core';
import { helpers } from '@eclipse-che/common';
import { AppState } from '../../../../../../store';
import * as FactoryResolverStore from '../../../../../../store/FactoryResolver';
import * as WorkspacesStore from '../../../../../../store/Workspaces';
import * as DevWorkspacesStore from '../../../../../../store/Workspaces/devWorkspaces';
import * as DevfileRegistriesStore from '../../../../../../store/DevfileRegistries';
import { DisposableCollection } from '../../../../../../services/helpers/disposable';
import { selectAllWorkspaces } from '../../../../../../store/Workspaces/selectors';
import { delay } from '../../../../../../services/helpers/delay';
import { FactoryLoaderPage } from '../../../../../../pages/Loader/Factory';
import { selectDefaultNamespace } from '../../../../../../store/InfrastructureNamespaces/selectors';
import {
  selectFactoryResolver,
  selectFactoryResolverConverted,
} from '../../../../../../store/FactoryResolver/selectors';
import prepareResources from './prepareResources';
import findTargetWorkspace from '../../../../findTargetWorkspace';
import { selectDevWorkspaceResources } from '../../../../../../store/DevfileRegistries/selectors';
import { buildIdeLoaderLocation } from '../../../../../../services/helpers/location';
import { Workspace } from '../../../../../../services/workspace-adapter';
import { FactoryParams } from '../../../types';
import { MIN_STEP_DURATION_MS, TIMEOUT_TO_CREATE_SEC } from '../../../../const';
import buildFactoryParams from '../../../buildFactoryParams';
import { AbstractLoaderStep, LoaderStepProps, LoaderStepState } from '../../../../AbstractStep';
import { AlertItem } from '../../../../../../services/helpers/types';
import { DevWorkspaceResources } from '../../../../../../store/DevfileRegistries';

export type Props = MappedProps &
  LoaderStepProps & {
    searchParams: URLSearchParams;
  };
export type State = LoaderStepState & {
  factoryParams: FactoryParams;
  newWorkspaceName?: string;
  resources?: DevWorkspaceResources;
  shouldCreate: boolean; // should the loader create a workspace
};

class StepApplyResources extends AbstractLoaderStep<Props, State> {
  protected readonly toDispose = new DisposableCollection();

  constructor(props: Props) {
    super(props);

    this.state = {
      factoryParams: buildFactoryParams(props.searchParams),
      shouldCreate: true,
    };
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
    if (!isEqual(this.state.lastError, nextState.lastError)) {
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

  protected handleRestart(): void {
    this.setState({
      shouldCreate: true,
      newWorkspaceName: undefined,
    });
    this.clearStepError();
    this.props.onRestart();
  }

  protected async runStep(): Promise<boolean> {
    await delay(MIN_STEP_DURATION_MS);

    const { devWorkspaceResources } = this.props;
    const { factoryParams, shouldCreate, resources } = this.state;
    const { cheEditor, factoryId, sourceUrl, storageType, policiesCreate } = factoryParams;

    const targetWorkspace = this.findTargetWorkspace(this.props, this.state);
    if (targetWorkspace) {
      // the workspace has been created, go to the next step
      const nextLocation = buildIdeLoaderLocation(targetWorkspace);
      this.props.history.location.pathname = nextLocation.pathname;
      this.props.history.location.search = '';
      return true;
    }

    if (shouldCreate === false) {
      if (this.state.lastError instanceof Error) {
        throw this.state.lastError;
      }
      throw new Error('The workspace creation unexpectedly failed.');
    }

    if (resources === undefined) {
      const _resources = devWorkspaceResources[sourceUrl]?.resources;
      if (_resources === undefined) {
        throw new Error('Failed to fetch devworkspace resources.');
      }

      // test the devWorkspace name to decide if we need to append a suffix to is
      const nameConflict = this.props.allWorkspaces.some(
        w => _resources[0].metadata.name === w.name,
      );
      const appendSuffix = policiesCreate === 'perclick' || nameConflict;

      // create a workspace using pre-generated resources
      const [devWorkspace, devWorkspaceTemplate] = prepareResources(
        _resources,
        factoryId,
        storageType,
        appendSuffix,
      );

      this.setState({
        newWorkspaceName: devWorkspace.metadata.name,
        resources: [devWorkspace, devWorkspaceTemplate],
      });
      return false;
    }

    await this.props.createWorkspaceFromResources(...resources, cheEditor);

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

  private findTargetWorkspace(props: Props, state: State): Workspace | undefined {
    if (state.newWorkspaceName === undefined) {
      return undefined;
    }
    return findTargetWorkspace(props.allWorkspaces, {
      namespace: props.defaultNamespace.name,
      workspaceName: state.newWorkspaceName,
    });
  }

  private getAlertItem(error: unknown): AlertItem | undefined {
    if (!error) {
      return;
    }
    return {
      key: 'factory-loader-apply-resources',
      title: 'Failed to create the workspace',
      variant: AlertVariant.danger,
      children: helpers.errors.getMessage(error),
      actionCallbacks: [
        {
          title: 'Click to try again',
          callback: () => this.handleRestart(),
        },
      ],
    };
  }

  render(): React.ReactElement {
    const { currentStepIndex, loaderSteps, tabParam } = this.props;
    const { lastError } = this.state;

    const steps = loaderSteps.values;
    const currentStepId = loaderSteps.get(currentStepIndex).value.id;

    const alertItem = this.getAlertItem(lastError);

    return (
      <FactoryLoaderPage
        alertItem={alertItem}
        currentStepId={currentStepId}
        steps={steps}
        tabParam={tabParam}
      />
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  allWorkspaces: selectAllWorkspaces(state),
  defaultNamespace: selectDefaultNamespace(state),
  factoryResolver: selectFactoryResolver(state),
  factoryResolverConverted: selectFactoryResolverConverted(state),
  devWorkspaceResources: selectDevWorkspaceResources(state),
});

const connector = connect(
  mapStateToProps,
  {
    ...DevfileRegistriesStore.actionCreators,
    ...FactoryResolverStore.actionCreators,
    ...WorkspacesStore.actionCreators,
    createWorkspaceFromResources: DevWorkspacesStore.actionCreators.createWorkspaceFromResources,
  },
  null,
  {
    // forwardRef is mandatory for using `@react-mock/state` in unit tests
    forwardRef: true,
  },
);
type MappedProps = ConnectedProps<typeof connector>;
export default connector(StepApplyResources);
