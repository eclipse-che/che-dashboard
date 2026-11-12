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

import common from '@eclipse-che/common';
import { AlertVariant, PageSection, PageSectionVariants, Tab, Tabs } from '@patternfly/react-core';
import React from 'react';
import { Location, NavigateFunction } from 'react-router-dom';

import Head from '@/components/Head';
import ProgressIndicator from '@/components/Progress';
import WorkspaceEvents from '@/components/WorkspaceEvents';
import WorkspaceLogs from '@/components/WorkspaceLogs';
import { lazyInject } from '@/inversify.config';
import AdvancedTab from '@/pages/WorkspaceDetails/AdvancedTab';
import BackupTab from '@/pages/WorkspaceDetails/BackupTab';
import Header from '@/pages/WorkspaceDetails/Header';
import { WorkspaceDetailsHeaderActions } from '@/pages/WorkspaceDetails/Header/Actions';
import styles from '@/pages/WorkspaceDetails/index.module.css';
import { OverviewTab } from '@/pages/WorkspaceDetails/OverviewTab';
import StorageTab from '@/pages/WorkspaceDetails/StorageTab';
import { AppAlerts } from '@/services/alerts/appAlerts';
import { buildDetailsLocation } from '@/services/helpers/location';
import { WorkspaceDetailsTab } from '@/services/helpers/types';
import { Workspace, WorkspaceAdapter } from '@/services/workspace-adapter';

export const SECTION_THEME = PageSectionVariants.default;

// single source of truth for the tab order, the allowed "?tab=" values and the rendered tabs
export const WORKSPACE_DETAILS_TABS = [
  WorkspaceDetailsTab.OVERVIEW,
  WorkspaceDetailsTab.STORAGE,
  WorkspaceDetailsTab.BACKUP,
  WorkspaceDetailsTab.LOGS,
  WorkspaceDetailsTab.EVENTS,
  WorkspaceDetailsTab.ADVANCED,
] as const;

export type Props = {
  location: Location;
  navigate: NavigateFunction;
  isLoading: boolean;
  workspace: Workspace | undefined;
  workspacesLink: string;
  onSave: (workspace: Workspace) => Promise<void>;
};

export type State = {
  activeTabKey: WorkspaceDetailsTab;
  showInlineAlertRestartWarning: boolean;
};

export class WorkspaceDetails extends React.PureComponent<Props, State> {
  private readonly overviewTabPageRef: React.RefObject<OverviewTab>;

  @lazyInject(AppAlerts)
  private readonly appAlerts: AppAlerts;

  constructor(props: Props) {
    super(props);

    this.overviewTabPageRef = React.createRef<OverviewTab>();

    this.state = {
      activeTabKey: this.getActiveTabKey(),
      showInlineAlertRestartWarning: false,
    };
  }

  private showAlert(variant: AlertVariant, title: string): void {
    const key = `wrks-details-${(
      '0000' + ((Math.random() * Math.pow(36, 4)) << 0).toString(36)
    ).slice(-4)}`;
    this.appAlerts.showAlert({ key, title, variant });
  }

  private handleCloseRestartWarning(): void {
    this.setState({
      showInlineAlertRestartWarning: false,
    });
  }

  private getActiveTabKey(): WorkspaceDetailsTab {
    const { pathname, search } = this.props.location;

    if (search) {
      const searchParam = new URLSearchParams(search);
      const tab = searchParam.get('tab');
      if (
        pathname.startsWith('/workspace/') &&
        WORKSPACE_DETAILS_TABS.includes(tab as WorkspaceDetailsTab)
      ) {
        return tab as WorkspaceDetailsTab;
      }
    }

    return WorkspaceDetailsTab.OVERVIEW;
  }

  private handleTabClick(
    event: React.MouseEvent<HTMLElement, MouseEvent>,
    activeTabKey: string | number,
  ): void {
    event.stopPropagation();
    this.props.navigate(`${this.props.location.pathname}?tab=${activeTabKey}`);

    this.setState({ activeTabKey: activeTabKey as WorkspaceDetailsTab });
  }

  public componentDidUpdate(): void {
    if (this.props.workspace && this.props.workspace?.isStopped) {
      this.handleCloseRestartWarning();
    }
  }

  public render(): React.ReactElement {
    const { workspace, workspacesLink } = this.props;

    if (!workspace) {
      return <div>Workspace not found.</div>;
    }

    const workspaceName = workspace.name;
    const containerScc = WorkspaceAdapter.getContainerScc(workspace.ref);

    return (
      <React.Fragment>
        <Head pageName={workspaceName} />
        <Header
          workspacesLink={workspacesLink}
          workspaceName={workspaceName}
          status={workspace.status}
          containerScc={containerScc}
        >
          <WorkspaceDetailsHeaderActions workspace={workspace} />
        </Header>
        <PageSection variant={SECTION_THEME} className={styles.workspaceDetailsTabs}>
          <Tabs
            activeKey={this.state.activeTabKey}
            onSelect={(event, eventKey) => this.handleTabClick(event, eventKey)}
          >
            {WORKSPACE_DETAILS_TABS.map(tabKey => (
              <Tab key={tabKey} eventKey={tabKey} title={tabKey}>
                {this.renderTabContent(tabKey, workspace)}
              </Tab>
            ))}
          </Tabs>
        </PageSection>
      </React.Fragment>
    );
  }

  // Generated by Claude Code
  private renderTabContent(tabKey: WorkspaceDetailsTab, workspace: Workspace): React.ReactNode {
    switch (tabKey) {
      case WorkspaceDetailsTab.OVERVIEW:
        return (
          <>
            <ProgressIndicator isLoading={this.props.isLoading} />
            <OverviewTab
              ref={this.overviewTabPageRef}
              workspace={workspace}
              onSave={workspaceToSave => this.handleOnSave(workspaceToSave)}
            />
          </>
        );
      case WorkspaceDetailsTab.STORAGE:
        return (
          <StorageTab
            key={workspace.uid}
            workspace={workspace}
            isActive={WorkspaceDetailsTab.STORAGE === this.state.activeTabKey}
          />
        );
      case WorkspaceDetailsTab.BACKUP:
        return <BackupTab workspace={workspace} />;
      case WorkspaceDetailsTab.LOGS:
        return (
          <WorkspaceLogs
            workspaceUID={workspace.uid}
            isActive={this.state.activeTabKey === WorkspaceDetailsTab.LOGS}
          />
        );
      case WorkspaceDetailsTab.EVENTS:
        return (
          <WorkspaceEvents
            workspaceUID={workspace.uid}
            isActive={this.state.activeTabKey === WorkspaceDetailsTab.EVENTS}
          />
        );
      case WorkspaceDetailsTab.ADVANCED:
        return <AdvancedTab workspace={workspace} />;
      default: {
        const exhaustiveCheck: never = tabKey;
        return exhaustiveCheck;
      }
    }
  }

  private async handleOnSave(workspace: Workspace): Promise<void> {
    try {
      await this.props.onSave(workspace);
      this.showAlert(AlertVariant.success, 'Workspace has been updated');

      const location = buildDetailsLocation(workspace, this.state.activeTabKey);
      this.props.navigate(location, { replace: true });
    } catch (e) {
      const errorMessage = common.helpers.errors.getMessage(e);
      this.showAlert(AlertVariant.danger, errorMessage);
    }
  }
}
