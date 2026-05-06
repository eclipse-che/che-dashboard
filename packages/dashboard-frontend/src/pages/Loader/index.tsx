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

import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  PageSection,
  PageSectionVariants,
  Tab,
  Tabs,
} from '@patternfly/react-core';
import { EllipsisVIcon, PlayIcon, StopIcon } from '@patternfly/react-icons';
import React from 'react';
import { Location, NavigateFunction } from 'react-router-dom';

import Head from '@/components/Head';
import Header from '@/components/Header';
import LoaderAgentPanelTab from '@/plugins/dashboard-ai-agent/components/LoaderAgentPanelTab';
import WorkspaceEvents from '@/components/WorkspaceEvents';
import WorkspaceLogs from '@/components/WorkspaceLogs';
import WorkspaceProgress from '@/components/WorkspaceProgress';
import {
  getRestartInDebugModeLocation,
  getRestartInSafeModeLocation,
} from '@/components/WorkspaceProgress/StartingSteps/StartWorkspace/prepareRestart';
import { ToggleBarsContext } from '@/contexts/ToggleBars';
import styles from '@/pages/Loader/index.module.css';
import { DevWorkspaceStatus, LoaderTab } from '@/services/helpers/types';
import { Workspace, WorkspaceAdapter } from '@/services/workspace-adapter';

export type Props = {
  location: Location;
  navigate: NavigateFunction;
  searchParams: URLSearchParams;
  tabParam: string | undefined;
  workspace: Workspace | undefined;
  workspaceStatus: DevWorkspaceStatus;
  onTabChange: (tab: LoaderTab) => void;
  onStartWorkspace: () => void;
  onStopWorkspace: () => void;
};

export type State = {
  activeTabKey: LoaderTab;
  isActionsOpen: boolean;
};

export class LoaderPage extends React.PureComponent<Props, State> {
  static contextType = ToggleBarsContext;
  readonly context: React.ContextType<typeof ToggleBarsContext>;

  private readonly appliedSafeMode: { [key: string]: boolean };

  constructor(props: Props) {
    super(props);

    const { tabParam } = this.props;
    const activeTabKey = tabParam && LoaderTab[tabParam] ? LoaderTab[tabParam] : LoaderTab.Progress;

    this.state = {
      activeTabKey,
      isActionsOpen: false,
    };

    this.appliedSafeMode = {};
  }

  componentDidMount(): void {
    this.context.hideAll();
  }

  private handleTabClick(tabIndex: React.ReactText): void {
    const tabKey = tabIndex as LoaderTab;

    this.setState({
      activeTabKey: tabKey,
    });
    const tab = LoaderTab[tabKey];
    this.props.onTabChange(tab);
  }

  private handleActionsToggle = () => {
    this.setState(prev => ({ isActionsOpen: !prev.isActionsOpen }));
  };

  render(): React.ReactNode {
    const {
      searchParams,
      workspace,
      workspaceStatus,
      location,
      navigate,
      onStartWorkspace,
      onStopWorkspace,
    } = this.props;
    const { activeTabKey, isActionsOpen } = this.state;

    let pageTitle = workspace ? `Starting workspace ${workspace.name}` : 'Creating a workspace';
    if (getRestartInSafeModeLocation(location) || this.appliedSafeMode[location.pathname]) {
      pageTitle += ' with default devfile';
      this.appliedSafeMode[location.pathname] = true;
    } else if (getRestartInDebugModeLocation(location)) {
      pageTitle += ' in Debug mode';
    }
    const showToastAlert = activeTabKey !== LoaderTab.Progress;

    const isLogsTabDisabled = workspace === undefined;
    const isEventsTabDisabled = workspace === undefined;

    const containerScc = workspace ? WorkspaceAdapter.getContainerScc(workspace.ref) : undefined;

    const isWorkspaceActive =
      workspaceStatus === DevWorkspaceStatus.STARTING ||
      workspaceStatus === DevWorkspaceStatus.RUNNING;

    const actionsDropdown = workspace ? (
      <Dropdown
        isOpen={isActionsOpen}
        onOpenChange={(open: boolean) => this.setState({ isActionsOpen: open })}
        toggle={(toggleRef: React.Ref<HTMLButtonElement>) => (
          <MenuToggle
            ref={toggleRef}
            variant="plain"
            onClick={this.handleActionsToggle}
            isExpanded={isActionsOpen}
            aria-label="Workspace actions"
          >
            <EllipsisVIcon />
          </MenuToggle>
        )}
        popperProps={{ position: 'right' }}
      >
        <DropdownList>
          <DropdownItem
            key="start"
            icon={<PlayIcon />}
            onClick={() => {
              this.setState({ isActionsOpen: false });
              onStartWorkspace();
            }}
            isDisabled={isWorkspaceActive}
          >
            Start
          </DropdownItem>
          <DropdownItem
            key="stop"
            icon={<StopIcon />}
            onClick={() => {
              this.setState({ isActionsOpen: false });
              onStopWorkspace();
            }}
            isDisabled={!isWorkspaceActive}
          >
            Stop
          </DropdownItem>
        </DropdownList>
      </Dropdown>
    ) : undefined;

    return (
      <React.Fragment>
        <Head pageName={pageTitle} />
        <Header
          title={pageTitle}
          status={workspaceStatus}
          containerScc={containerScc}
          actions={actionsDropdown}
        />
        <PageSection
          variant={PageSectionVariants.default}
          isFilled={true}
          className={styles.loaderPage}
        >
          <Tabs
            activeKey={activeTabKey}
            onSelect={(_event, tabIndex) => this.handleTabClick(tabIndex)}
            inset={{ default: 'insetLg' }}
            data-testid="loader-tabs"
          >
            <Tab
              eventKey={LoaderTab.Progress}
              title={LoaderTab.Progress}
              data-testid="loader-progress-tab"
              id="loader-progress-tab"
            >
              <PageSection isFilled={true}>
                <WorkspaceProgress
                  location={location}
                  navigate={navigate}
                  searchParams={searchParams}
                  showToastAlert={showToastAlert}
                  isProgressTabActive={activeTabKey === LoaderTab.Progress}
                  onTabChange={tab => this.handleTabClick(tab)}
                />
              </PageSection>
            </Tab>
            <Tab
              eventKey={LoaderTab.Logs}
              title={LoaderTab.Logs}
              data-testid="loader-logs-tab"
              id="loader-logs-tab"
              isDisabled={isLogsTabDisabled}
              isAriaDisabled={isLogsTabDisabled}
            >
              <WorkspaceLogs
                workspaceUID={workspace?.uid}
                isActive={activeTabKey === LoaderTab.Logs}
              />
            </Tab>
            <Tab
              eventKey={LoaderTab.Events}
              title={LoaderTab.Events}
              data-testid="loader-events-tab"
              id="loader-events-tab"
              isDisabled={isEventsTabDisabled}
              isAriaDisabled={isEventsTabDisabled}
            >
              <WorkspaceEvents
                workspaceUID={workspace?.uid}
                hideWhenStopped={false}
                isActive={activeTabKey === LoaderTab.Events}
              />
            </Tab>
            <Tab
              eventKey="DevWorkspaces"
              title="DevWorkspaces"
              data-testid="loader-devworkspaces-tab"
              id="loader-devworkspaces-tab"
            >
              <LoaderAgentPanelTab
                workspace={workspace}
                isActive={activeTabKey === ('DevWorkspaces' as LoaderTab)}
              />
            </Tab>
          </Tabs>
        </PageSection>
      </React.Fragment>
    );
  }
}
