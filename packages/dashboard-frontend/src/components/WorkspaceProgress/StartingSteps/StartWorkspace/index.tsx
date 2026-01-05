/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import common, { ApplicationId } from '@eclipse-che/common';
import { AlertVariant } from '@patternfly/react-core';
import isEqual from 'lodash/isEqual';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import {
  ProgressStep,
  ProgressStepProps,
  ProgressStepState,
} from '@/components/WorkspaceProgress/ProgressStep';
import { buildPVCErrorMessage } from '@/components/WorkspaceProgress/StartingSteps/StartWorkspace/buildPVCErrorMessage';
import { hasPVCErrors } from '@/components/WorkspaceProgress/StartingSteps/StartWorkspace/detectPVCErrors';
import {
  applyRestartDefaultLocation,
  applyRestartInSafeModeLocation,
  getStartParams,
  resetRestartInSafeModeLocation,
} from '@/components/WorkspaceProgress/StartingSteps/StartWorkspace/prepareRestart';
import { ProgressStepTitle } from '@/components/WorkspaceProgress/StepTitle';
import { TimeLimit } from '@/components/WorkspaceProgress/TimeLimit';
import workspaceStatusIs from '@/components/WorkspaceProgress/workspaceStatusIs';
import { lazyInject } from '@/inversify.config';
import { WorkspaceRouteParams } from '@/Routes';
import { AppAlerts } from '@/services/alerts/appAlerts';
import { findTargetWorkspace } from '@/services/helpers/factoryFlow/findTargetWorkspace';
import { SCC_MISMATCH_WARNING_MESSAGE } from '@/services/helpers/sccMismatch';
import { AlertItem, DevWorkspaceStatus, LoaderTab } from '@/services/helpers/types';
import { Workspace, WorkspaceAdapter } from '@/services/workspace-adapter';
import { RootState } from '@/store';
import { selectBranding } from '@/store/Branding/selectors';
import { selectApplications } from '@/store/ClusterInfo/selectors';
import { selectEventsFromResourceVersion } from '@/store/Events';
import { selectCurrentScc, selectStartTimeout } from '@/store/ServerConfig/selectors';
import { workspacesActionCreators } from '@/store/Workspaces';
import {
  selectDevWorkspaceWarnings,
  selectStartedWorkspaces,
} from '@/store/Workspaces/devWorkspaces/selectors';
import { selectAllWorkspaces } from '@/store/Workspaces/selectors';

export type Props = MappedProps &
  ProgressStepProps & {
    matchParams: WorkspaceRouteParams | undefined;
  };
export type State = ProgressStepState & {
  shouldStart: boolean; // should the loader start a workspace?
  shouldUpdateWithDefaultDevfile: boolean;
  warning: string | undefined;
};

class StartingStepStartWorkspace extends ProgressStep<Props, State> {
  protected readonly name = 'Waiting for workspace to start';

  /**
   * Static set to track workspace UIDs with pending restart.
   * Used to skip PVC error detection during restart flow.
   * This persists across component re-renders unlike React state.
   */
  private static restartInitiatedSet: Set<string> = new Set();

  // For testing: clear the static set
  public static clearRestartInitiatedSet(): void {
    StartingStepStartWorkspace.restartInitiatedSet.clear();
  }

  // Getter to access restartInitiatedSet for hasPVCErrors
  public static getRestartInitiatedSet(): Set<string> {
    return StartingStepStartWorkspace.restartInitiatedSet;
  }

  @lazyInject(AppAlerts)
  private readonly appAlerts: AppAlerts;

  constructor(props: Props) {
    super(props);

    this.state = {
      warning: undefined,
      shouldStart: true,
      name: this.name,
      shouldUpdateWithDefaultDevfile: false,
    };
  }

  public componentDidMount() {
    this.init();
  }

  public async componentDidUpdate() {
    const safeMode = resetRestartInSafeModeLocation(this.props.location);
    if (safeMode) {
      this.setState({ shouldUpdateWithDefaultDevfile: safeMode });
      return;
    }

    this.init();
  }

  public shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    // active step changed
    if (this.props.distance !== nextProps.distance) {
      return true;
    }

    // show/hide spinner near the step title
    if (this.props.hasChildren !== nextProps.hasChildren) {
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

    if (this.state.shouldUpdateWithDefaultDevfile !== nextState.shouldUpdateWithDefaultDevfile) {
      return true;
    }

    if (this.props.location.search !== nextProps.location.search) {
      return true;
    }

    if (
      workspace !== undefined &&
      nextWorkspace !== undefined &&
      this.props.devWorkspaceWarnings[workspace.uid] !==
        nextProps.devWorkspaceWarnings[nextWorkspace.uid]
    ) {
      return true;
    }

    const currentHasPVCErrors = hasPVCErrors(
      workspace,
      this.props.startedWorkspaces,
      this.props.eventsFromResourceVersionFn,
      StartingStepStartWorkspace.restartInitiatedSet,
    );
    const nextHasPVCErrors = hasPVCErrors(
      nextWorkspace,
      nextProps.startedWorkspaces,
      nextProps.eventsFromResourceVersionFn,
      StartingStepStartWorkspace.restartInitiatedSet,
    );
    return currentHasPVCErrors !== nextHasPVCErrors;
  }

  public componentWillUnmount(): void {
    this.toDispose.dispose();
  }

  private init() {
    if (this.props.distance !== 0) {
      return;
    }

    const workspace = this.findTargetWorkspace(this.props);

    // Reset shouldStart flag once workspace is starting/running
    // Skip if restart was initiated - allow the restart flow to complete
    if (
      workspace &&
      this.state.shouldStart &&
      (workspace.isStarting || workspace.isRunning) &&
      !StartingStepStartWorkspace.restartInitiatedSet.has(workspace.uid)
    ) {
      this.setState({
        shouldStart: false,
      });
    }

    if (workspace !== undefined) {
      const warning = this.props.devWorkspaceWarnings[workspace.uid];
      if (warning) {
        this.setState({
          warning,
        });
      }
      const pvcErrors = hasPVCErrors(
        workspace,
        this.props.startedWorkspaces,
        this.props.eventsFromResourceVersionFn,
        StartingStepStartWorkspace.restartInitiatedSet,
      );
      if (pvcErrors) {
        this.handlePVCError(workspace);
      }
    }

    this.prepareAndRun();
  }

  /**
   * Handles workspace restart action from error alert.
   * If workspace is running/starting, stops it first and marks for restart.
   * Otherwise, triggers immediate restart via onRestart callback.
   */
  protected async handleRestart(alertKey: string, tab: LoaderTab): Promise<void> {
    this.props.onHideError(alertKey);

    const workspace = this.findTargetWorkspace(this.props);

    // If workspace is running/starting, stop it first
    // Add to restartInitiatedSet to skip PVC detection until workspace restarts
    if (workspace && (workspace.isStarting || workspace.isRunning)) {
      try {
        await this.props.stopWorkspace(workspace);
        StartingStepStartWorkspace.restartInitiatedSet.add(workspace.uid);
        this.setState({
          shouldStart: true,
          lastError: undefined,
        });
        return;
      } catch (e) {
        const error = new Error(
          `Failed to stop workspace "${workspace.name}" before restart. ${common.helpers.errors.getMessage(e)}`,
        );
        this.handleError(error);
        return;
      }
    }

    // Workspace is already stopped - trigger restart directly
    this.setState({ shouldStart: true, lastError: undefined }, () => {
      this.props.onRestart(tab);
    });
  }

  protected handleTimeout(workspace: Workspace | undefined): void {
    const message =
      workspace === undefined
        ? 'Cannot determine the workspace to start.'
        : `The workspace status remains "${workspace.status}" in the last ${this.props.startTimeout} seconds.`;
    const timeoutError = new Error(message);
    this.handleError(timeoutError);
  }

  protected handlePVCError(workspace: Workspace | undefined): void {
    const message = buildPVCErrorMessage(workspace, this.props.applications);
    const pvcError: Error & { detailedMessage?: React.ReactNode } = new Error(
      typeof message === 'string' ? message : 'PVC is full, workspace will fail to start.',
    );
    // Store the React element for display in buildAlertItem
    pvcError.detailedMessage = message;
    this.handleError(pvcError);
  }

  /**
   * Check if there's an SCC mismatch between the workspace and server configuration.
   * Returns true if server has SCC configured but workspace has different or missing SCC.
   */
  private hasSccMismatch(workspace: Workspace): boolean {
    const { currentScc } = this.props;
    // If server has no SCC requirement, no mismatch
    if (currentScc === undefined) {
      return false;
    }
    // Server has SCC requirement - check if workspace matches
    const containerScc = WorkspaceAdapter.getContainerScc(workspace.ref);
    return containerScc !== currentScc;
  }

  /**
   * The resolved boolean indicates whether to go to the next step or not
   */
  protected async runStep(): Promise<boolean> {
    const { matchParams } = this.props;
    if (matchParams === undefined) {
      throw new Error('Cannot determine the workspace to start.');
    }

    const workspace = this.findTargetWorkspace(this.props);

    if (workspace === undefined) {
      throw new Error(
        `Workspace "${matchParams.namespace}/${matchParams.workspaceName}" not found.`,
      );
    }

    // Check for SCC mismatch - show warning but allow start
    if (this.hasSccMismatch(workspace)) {
      const documentationUrl = this.props.branding.docs.containerRunCapabilities;
      this.appAlerts.showAlert({
        key: 'scc-mismatch-warning',
        title: SCC_MISMATCH_WARNING_MESSAGE,
        variant: AlertVariant.warning,
        children: documentationUrl ? (
          <a href={documentationUrl} target="_blank" rel="noopener noreferrer">
            Learn more
          </a>
        ) : undefined,
      });
    }

    if (this.state.warning !== undefined) {
      this.appAlerts.showAlert({
        key: 'start-workspace-warning',
        title: `WARNING: ${this.state.warning}`,
        variant: AlertVariant.warning,
      });
      return true;
    }

    if (this.state.shouldUpdateWithDefaultDevfile) {
      await this.props.updateWorkspaceWithDefaultDevfile(workspace);
      this.setState({ shouldUpdateWithDefaultDevfile: false });
      return false;
    }

    // Check for PVC errors - restartInitiatedSet skips detection during restart
    const pvcErrors = hasPVCErrors(
      workspace,
      this.props.startedWorkspaces,
      this.props.eventsFromResourceVersionFn,
      StartingStepStartWorkspace.restartInitiatedSet,
    );
    if (pvcErrors) {
      this.handlePVCError(workspace);
      // Don't proceed further if PVC error is detected
      return false;
    }

    if (
      workspaceStatusIs(workspace, DevWorkspaceStatus.TERMINATING) ||
      (!this.state.shouldStart && workspaceStatusIs(workspace, DevWorkspaceStatus.FAILED))
    ) {
      throw new Error(
        workspace.error || `The workspace status changed unexpectedly to "${workspace.status}".`,
      );
    }

    if (workspace.isRunning) {
      // switch to the next step
      return true;
    }

    // Start workspace if it's stopped/failed and shouldStart is true
    if (
      this.state.shouldStart &&
      workspaceStatusIs(workspace, DevWorkspaceStatus.STOPPED, DevWorkspaceStatus.FAILED)
    ) {
      await this.props.startWorkspace(workspace, getStartParams(this.props.location));
      // Clear restart flag after workspace starts to re-enable PVC detection
      StartingStepStartWorkspace.restartInitiatedSet.delete(workspace.uid);
    }

    // do not switch to the next step
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
    const actionCallbacks = [
      {
        title: 'Restart',
        callback: () => {
          applyRestartDefaultLocation(this.props.location);
          this.handleRestart(key, LoaderTab.Progress);
        },
      },
      {
        title: 'Restart with default devfile',
        callback: () => {
          applyRestartInSafeModeLocation(this.props.location);
          this.handleRestart(key, LoaderTab.Progress);
        },
      },
    ];

    const isOpenshift = this.props.applications.length === 1;
    if (isOpenshift) {
      actionCallbacks.push({
        title: 'Edit the DevWorkspace spec',
        callback: () => {
          this.openDevWorkspaceClusterConsole();
        },
      });
    }

    // Use detailed message if available (for PVC errors)
    const errorMessage =
      (error as Error & { detailedMessage?: React.ReactNode }).detailedMessage ||
      common.helpers.errors.getMessage(error);

    return {
      key,
      title: 'Failed to open the workspace',
      variant: AlertVariant.warning,
      children: errorMessage,
      actionCallbacks,
    };
  }

  private openDevWorkspaceClusterConsole(): void {
    const { applications } = this.props;
    const workspace = this.findTargetWorkspace(this.props);

    const clusterConsole = applications.find(app => app.id === ApplicationId.CLUSTER_CONSOLE);

    if (!clusterConsole || !workspace) {
      return;
    }

    const devWorkspaceConsoleUrl = WorkspaceAdapter.buildClusterConsoleUrl(
      workspace.ref,
      clusterConsole.url,
    );

    const target = 'devWorkspaceSpec' + workspace.uid;

    window.open(`${devWorkspaceConsoleUrl}/yaml`, target);
  }

  render(): React.ReactNode {
    const { distance, hasChildren, startTimeout } = this.props;
    const { name, lastError } = this.state;

    const isActive = distance === 0;
    const isError = false;
    const isWarning = lastError !== undefined;

    const workspace = this.findTargetWorkspace(this.props);

    return (
      <React.Fragment>
        {isActive && (
          <TimeLimit timeLimitSec={startTimeout} onTimeout={() => this.handleTimeout(workspace)} />
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

const mapStateToProps = (state: RootState) => ({
  allWorkspaces: selectAllWorkspaces(state),
  applications: selectApplications(state),
  branding: selectBranding(state),
  currentScc: selectCurrentScc(state),
  startTimeout: selectStartTimeout(state),
  devWorkspaceWarnings: selectDevWorkspaceWarnings(state),
  eventsFromResourceVersionFn: selectEventsFromResourceVersion(state),
  startedWorkspaces: selectStartedWorkspaces(state),
});

const connector = connect(mapStateToProps, workspacesActionCreators, null, {
  // forwardRef is mandatory for using `@react-mock/state` in unit tests
  forwardRef: true,
});
type MappedProps = ConnectedProps<typeof connector>;
export default connector(StartingStepStartWorkspace);
