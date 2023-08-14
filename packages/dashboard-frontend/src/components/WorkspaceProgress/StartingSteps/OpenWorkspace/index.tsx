/*
 * Copyright (c) 2018-2023 Red Hat, Inc.
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
import { AlertVariant } from '@patternfly/react-core';
import { isEqual } from 'lodash';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { WorkspaceParams } from '../../../../Routes/routes';
import { isAvailableEndpoint } from '../../../../services/helpers/api-ping';
import { findTargetWorkspace } from '../../../../services/helpers/factoryFlow/findTargetWorkspace';
import { AlertItem, LoaderTab } from '../../../../services/helpers/types';
import { Workspace } from '../../../../services/workspace-adapter';
import { AppState } from '../../../../store';
import * as WorkspaceStore from '../../../../store/Workspaces';
import { selectAllWorkspaces } from '../../../../store/Workspaces/selectors';
import { TIMEOUT_TO_GET_URL_SEC } from '../../const';
import { ProgressStep, ProgressStepProps, ProgressStepState } from '../../ProgressStep';
import { ProgressStepTitle } from '../../StepTitle';
import { TimeLimit } from '../../TimeLimit';
import {
  DEBUG_WORKSPACE_START,
  USE_DEFAULT_DEVFILE,
} from '../../../../services/helpers/factoryFlow/buildFactoryParams';

export type Props = MappedProps &
  ProgressStepProps & {
    matchParams: WorkspaceParams | undefined;
  };
export type State = ProgressStepState;

class StartingStepOpenWorkspace extends ProgressStep<Props, State> {
  protected readonly name = 'Open IDE';

  constructor(props: Props) {
    super(props);

    this.state = {
      name: this.name,
    };
  }

  private init(): void {
    if (this.props.distance !== 0) {
      return;
    }

    if (this.state.lastError) {
      return;
    }

    this.prepareAndRun();
  }

  public componentDidMount() {
    this.init();
  }

  public async componentDidUpdate() {
    this.init();
  }

  public componentWillUnmount(): void {
    this.toDispose.dispose();
  }

  public shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    // active step changed
    if (this.props.distance !== nextProps.distance) {
      return true;
    }

    const workspace = this.findTargetWorkspace(this.props);
    const nextWorkspace = this.findTargetWorkspace(nextProps);

    // change workspace status, etc.
    if (
      workspace?.uid !== nextWorkspace?.uid ||
      workspace?.status !== nextWorkspace?.status ||
      workspace?.ideUrl !== nextWorkspace?.ideUrl
    ) {
      return true;
    }
    // set the error for the current step
    if (!isEqual(this.state.lastError, nextState.lastError)) {
      return true;
    }
    return false;
  }

  protected handleRestartInSafeMode(alertKey: string, tab: LoaderTab): void {
    const searchParams = new URLSearchParams(this.props.history.location.search);
    searchParams.set(USE_DEFAULT_DEVFILE, 'true');
    searchParams.delete(DEBUG_WORKSPACE_START);
    this.props.history.location.search = searchParams.toString();

    this.props.onHideError(alertKey);

    this.clearStepError();
    this.props.onRestart(tab);
  }

  protected handleRestartInDebugMode(alertKey: string, tab: LoaderTab): void {
    const searchParams = new URLSearchParams(this.props.history.location.search);
    searchParams.set(DEBUG_WORKSPACE_START, 'true');
    searchParams.delete(USE_DEFAULT_DEVFILE);
    this.props.history.location.search = searchParams.toString();

    this.props.onHideError(alertKey);

    this.clearStepError();
    this.props.onRestart(tab);
  }

  protected handleRestart(alertKey: string, tab: LoaderTab): void {
    const searchParams = new URLSearchParams(this.props.history.location.search);
    searchParams.delete(DEBUG_WORKSPACE_START);
    searchParams.delete(USE_DEFAULT_DEVFILE);
    this.props.history.location.search = searchParams.toString();

    this.props.onHideError(alertKey);

    this.clearStepError();
    this.props.onRestart(tab);
  }

  protected handleTimeout(): void {
    const timeoutError = new Error(
      `The workspace has not received an IDE URL in the last ${TIMEOUT_TO_GET_URL_SEC} seconds. Try to re-open the workspace.`,
    );
    this.handleError(timeoutError);
  }

  protected async runStep(): Promise<boolean> {
    const { matchParams } = this.props;
    const workspace = this.findTargetWorkspace(this.props);

    if (matchParams === undefined) {
      throw new Error('Cannot determine the workspace to start.');
    }

    if (workspace === undefined) {
      throw new Error(
        `Workspace "${matchParams.namespace}/${matchParams.workspaceName}" not found.`,
      );
    }

    if (!workspace.isRunning) {
      throw new Error(
        workspace.error || `The workspace status changed unexpectedly to "${workspace.status}".`,
      );
    }

    if (!workspace.ideUrl) {
      // wait for the IDE url to be set
      return false;
    }

    const isAvailable = await isAvailableEndpoint(workspace.ideUrl);
    if (isAvailable) {
      window.location.replace(workspace.ideUrl);
      return true;
    }

    return false;
  }

  protected findTargetWorkspace(props: Props): Workspace | undefined {
    if (props.matchParams === undefined) {
      return;
    }
    return findTargetWorkspace(props.allWorkspaces, props.matchParams);
  }

  protected buildAlertItem(error: Error): AlertItem {
    const key = this.name;
    return {
      key,
      title: 'Failed to open the workspace',
      variant: AlertVariant.danger,
      children: common.helpers.errors.getMessage(error),
      actionCallbacks: [
        {
          title: 'Restart',
          callback: () => this.handleRestart(key, LoaderTab.Progress),
        },
        {
          title: 'Restart in Safe mode',
          callback: () => this.handleRestartInSafeMode(key, LoaderTab.Progress),
        },
        {
          title: 'Open in Debug mode',
          callback: () => this.handleRestartInDebugMode(key, LoaderTab.Logs),
        },
      ],
    };
  }

  render(): React.ReactNode {
    const { distance, hasChildren } = this.props;
    const { name, lastError } = this.state;

    const isActive = distance === 0;
    const isError = lastError !== undefined;
    const isWarning = false;

    return (
      <React.Fragment>
        {isActive && (
          <TimeLimit timeLimitSec={TIMEOUT_TO_GET_URL_SEC} onTimeout={() => this.handleTimeout()} />
        )}
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

const mapStateToProps = (state: AppState) => ({
  allWorkspaces: selectAllWorkspaces(state),
});

const connector = connect(mapStateToProps, WorkspaceStore.actionCreators, null, {
  // forwardRef is mandatory for using `@react-mock/state` in unit tests
  forwardRef: true,
});
type MappedProps = ConnectedProps<typeof connector>;
export default connector(StartingStepOpenWorkspace);
