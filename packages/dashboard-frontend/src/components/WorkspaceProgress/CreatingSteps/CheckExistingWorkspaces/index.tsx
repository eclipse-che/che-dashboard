/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { helpers } from '@eclipse-che/common';
import { AlertVariant } from '@patternfly/react-core';
import isEqual from 'lodash/isEqual';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import {
  ProgressStep,
  ProgressStepProps,
  ProgressStepState,
} from '@/components/WorkspaceProgress/ProgressStep';
import { ProgressStepTitle } from '@/components/WorkspaceProgress/StepTitle';
import { lazyInject } from '@/inversify.config';
import {
  buildFactoryParams,
  FactoryParams,
} from '@/services/helpers/factoryFlow/buildFactoryParams';
import { buildIdeLoaderLocation, toHref } from '@/services/helpers/location';
import { ActionCallback, ActionGroup, AlertItem } from '@/services/helpers/types';
import { TabManager } from '@/services/tabManager';
import { Workspace } from '@/services/workspace-adapter';
import { RootState } from '@/store';
import { selectDevWorkspaceResources } from '@/store/DevfileRegistries/selectors';
import { selectFactoryResolver } from '@/store/FactoryResolver/selectors';
import { selectAllWorkspaces } from '@/store/Workspaces/selectors';

export type Props = MappedProps &
  ProgressStepProps & {
    searchParams: URLSearchParams;
    onHideError: (key: string) => void;
  };
export type State = ProgressStepState & {
  existingWorkspace: Workspace | undefined; // a workspace with the same name that fetched resource has
  factoryParams: FactoryParams;
  shouldCreate: boolean; // should the loader proceed with creating a new workspace or switch to the existing one
};

class CreatingStepCheckExistingWorkspaces extends ProgressStep<Props, State> {
  protected readonly name = 'Checking if a workspace with the same name exists';

  @lazyInject(TabManager)
  private readonly tabManager: TabManager;

  constructor(props: Props) {
    super(props);

    this.state = {
      existingWorkspace: undefined,
      factoryParams: buildFactoryParams(props.searchParams),
      shouldCreate: false,
      name: this.name,
    };
  }

  public componentDidMount() {
    this.init();
  }

  public componentDidUpdate() {
    this.init();
  }

  public shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    // active step changed
    if (this.props.distance !== nextProps.distance) {
      return true;
    }

    // current step failed
    if (!isEqual(this.state.lastError, nextState.lastError)) {
      return true;
    }

    if (this.state.shouldCreate !== nextState.shouldCreate) {
      return true;
    }

    return false;
  }

  public componentWillUnmount(): void {
    this.toDispose.dispose();
  }

  private init() {
    if (this.props.distance !== 0) {
      return;
    }

    if (this.state.lastError) {
      return;
    }

    this.prepareAndRun();
  }

  protected handleRestart(): void {
    this.setState({
      shouldCreate: false,
    });
    this.clearStepError();
    this.props.onRestart();
  }

  private handleNameConflict(alertKey: string, action: 'create-new' | 'open-existing'): void {
    this.props.onHideError(alertKey);

    if (action === 'create-new') {
      // proceed with creating an new workspace
      this.setState({
        shouldCreate: true,
      });
      this.clearStepError();
      return;
    }
    this.openWorkspace(this.state.existingWorkspace);
  }

  /**
   * Opens the workspace in the IDE.
   * If the workspace is undefined, it does nothing.
   */
  private openWorkspace(workspace: Workspace | undefined): void {
    if (workspace === undefined) {
      return;
    }
    const workspaceLocation = buildIdeLoaderLocation(workspace);
    const url = toHref(workspaceLocation);
    this.tabManager.replace(url);
    this.tabManager.reload();
  }

  protected async runStep(): Promise<boolean> {
    const { allWorkspaces, devWorkspaceResources, factoryResolver } = this.props;
    const { factoryParams, shouldCreate } = this.state;

    if (shouldCreate) {
      // user decided to create a new workspace
      return true;
    }
    if (factoryParams.policiesCreate === 'perclick') {
      // continue creating new workspace in accordance to the policy
      return true;
    }

    // check if there are existing workspaces created from the same repo
    const existingWorkspacesFromTheSameRepo = this.getExistingWorkspacesFromTheSameRepo(
      allWorkspaces,
      factoryParams,
    );
    if (existingWorkspacesFromTheSameRepo.length > 0) {
      let existingWorkspace: Workspace | undefined = undefined;
      if (factoryParams.existing) {
        // if the factory params specify an existing workspace, use it
        existingWorkspace = existingWorkspacesFromTheSameRepo.find(
          workspace => workspace.name === factoryParams.existing,
        );
        if (existingWorkspace === undefined) {
          this.handleError(
            new Error(
              `Several workspaces created from the same repository have been found. Should you want to open one of the existing workspaces or create a new one, please choose the corresponding action.`,
            ),
          );
          return false;
        }
      } else if (existingWorkspacesFromTheSameRepo.length > 1) {
        // detected existing workspaces created from the same repo conflict
        this.handleError(
          new Error(
            `Several workspaces created from the same repository have been found. Should you want to open one of the existing workspaces or create a new one, please choose the corresponding action.`,
          ),
        );
        return false;
      }
      if (existingWorkspace === undefined) {
        // otherwise, use the first one
        existingWorkspace = existingWorkspacesFromTheSameRepo[0];
      }
      this.openWorkspace(existingWorkspace);
      // stop the step execution
      return false;
    }

    let newWorkspaceName: string;
    if (factoryParams.useDevWorkspaceResources === true) {
      const resources = devWorkspaceResources[factoryParams.sourceUrl]?.resources;
      if (resources === undefined) {
        // going to use the default devfile in the next step
        return true;
      }

      const [devWorkspace] = resources;
      newWorkspaceName = devWorkspace.metadata.name;
    } else {
      if (
        factoryResolver === undefined ||
        factoryResolver.location !== factoryParams.sourceUrl ||
        factoryResolver?.devfile === undefined
      ) {
        // going to use the default devfile in the next step
        return true;
      }

      const devfile = factoryResolver.devfile;
      newWorkspaceName = devfile.metadata.name;
    }

    // check existing workspaces to avoid name conflicts
    const existingWorkspace = this.props.allWorkspaces.find(w => newWorkspaceName === w.name);
    if (existingWorkspace) {
      // detected workspaces name conflict
      this.handleError(
        new Error(
          `A workspace with the same name (${existingWorkspace.name}) has been found. Should you want to open the existing workspace or proceed to create a new one, please choose the corresponding action.`,
        ),
      );
      this.setState({
        existingWorkspace,
      });
      return false;
    }

    return true;
  }

  private getExistingWorkspacesFromTheSameRepo(
    workspaces: Workspace[],
    factoryParams: FactoryParams,
  ): Workspace[] {
    return workspaces.filter(workspace => workspace.source === factoryParams.sourceUrl);
  }

  protected buildAlertItem(error: Error): AlertItem {
    const key = this.name;
    const existingWorkspacesFromTheSameRepo = this.getExistingWorkspacesFromTheSameRepo(
      this.props.allWorkspaces,
      this.state.factoryParams,
    );
    let title: string;
    let openExistingWorkspaceAction: ActionCallback | ActionGroup;
    if (existingWorkspacesFromTheSameRepo.length > 0) {
      title = 'Existing workspaces created from the same repository are found';
      openExistingWorkspaceAction = {
        isGroup: true,
        title: 'Open the existing workspace',
        actionCallbacks: existingWorkspacesFromTheSameRepo.map(workspace => ({
          title: workspace.name,
          callback: () => {
            this.props.onHideError(key);
            this.openWorkspace(workspace);
          },
        })),
      };
    } else {
      title = 'Existing workspace found';
      openExistingWorkspaceAction = {
        title: 'Open the existing workspace',
        callback: () => this.handleNameConflict(key, 'open-existing'),
      };
    }

    return {
      key,
      title,
      variant: AlertVariant.warning,
      children: helpers.errors.getMessage(error),
      actionCallbacks: [
        openExistingWorkspaceAction,
        {
          title: 'Create a new workspace',
          callback: () => this.handleNameConflict(key, 'create-new'),
        },
      ],
    };
  }

  render(): React.ReactElement {
    const { distance, hasChildren } = this.props;
    const { name, lastError } = this.state;

    const isError = lastError !== undefined;
    const isWarning = false;

    return (
      <React.Fragment>
        <ProgressStepTitle
          distance={distance}
          hasChildren={hasChildren}
          isError={isError}
          isWarning={isWarning}
        >
          {name}
        </ProgressStepTitle>
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  allWorkspaces: selectAllWorkspaces(state),
  devWorkspaceResources: selectDevWorkspaceResources(state),
  factoryResolver: selectFactoryResolver(state),
});

const connector = connect(mapStateToProps, null, null, {
  // forwardRef is mandatory for using `@react-mock/state` in unit tests
  forwardRef: true,
});
type MappedProps = ConnectedProps<typeof connector>;
export default connector(CreatingStepCheckExistingWorkspaces);
