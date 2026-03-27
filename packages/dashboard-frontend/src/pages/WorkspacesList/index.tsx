/*
 * Copyright (c) 2018-2026 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import 'reflect-metadata';

import { BackupInfo } from '@eclipse-che/common';
import {
  Content,
  PageSection,
  PageSectionVariants,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import React from 'react';
import { Location, NavigateFunction } from 'react-router-dom';

import Head from '@/components/Head';
import BackupsView from '@/pages/WorkspacesList/BackupsView';
import WorkspacesView from '@/pages/WorkspacesList/WorkspacesView';
import { BrandingData } from '@/services/bootstrap/branding.constant';
import devfileApi from '@/services/devfileApi';
import { Workspace } from '@/services/workspace-adapter';

type Props = {
  backupsByWorkspace: Record<string, BackupInfo>;
  branding: BrandingData;
  editors: devfileApi.Devfile[];
  location: Location;
  navigate: NavigateFunction;
  workspaces: Workspace[];
};

type ViewMode = 'workspaces' | 'backups';

type State = {
  viewMode: ViewMode;
};

export default class WorkspacesList extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    const viewMode = this.getViewModeFromUrl(props.location);
    this.state = {
      viewMode,
    };
  }

  private getViewModeFromUrl(location: Location): ViewMode {
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    if (view === 'backups') {
      return 'backups';
    }
    return 'workspaces';
  }

  private handleViewModeChange(viewMode: ViewMode): void {
    this.setState({ viewMode });
    const newSearch = new URLSearchParams({ view: viewMode }).toString();
    this.props.navigate(`${this.props.location.pathname}?${newSearch}`, { replace: true });
  }

  public componentDidUpdate(prevProps: Props): void {
    if (prevProps.location.search !== this.props.location.search) {
      const viewMode = this.getViewModeFromUrl(this.props.location);
      if (viewMode !== this.state.viewMode) {
        this.setState({ viewMode });
      }
    }
  }

  public render(): React.ReactElement {
    const { backupsByWorkspace, branding, editors, navigate, workspaces } = this.props;
    const { workspace: workspacesDocsLink } = branding.docs;
    const { viewMode } = this.state;

    return (
      <React.Fragment>
        <Head pageName="Workspaces" />
        <PageSection variant={PageSectionVariants.default}>
          <Content>
            <Content component="h1">Workspaces</Content>
            <Content component="p">
              A workspace is where your projects live and run. Create workspaces from stacks that
              define projects, runtimes, and commands.&emsp;
              <a href={workspacesDocsLink} target="_blank" rel="noopener noreferrer">
                Learn&nbsp;more&nbsp;
                <ExternalLinkAltIcon />
              </a>
            </Content>
          </Content>
        </PageSection>
        <PageSection variant={PageSectionVariants.default}>
          <ToggleGroup aria-label="View toggle">
            <ToggleGroupItem
              text="Active Workspaces"
              buttonId="view-workspaces"
              isSelected={viewMode === 'workspaces'}
              onChange={() => this.handleViewModeChange('workspaces')}
            />
            <ToggleGroupItem
              text="Backups"
              buttonId="view-backups"
              isSelected={viewMode === 'backups'}
              onChange={() => this.handleViewModeChange('backups')}
            />
          </ToggleGroup>
        </PageSection>
        {viewMode === 'backups' ? (
          <BackupsView navigate={navigate} />
        ) : (
          <WorkspacesView
            workspaces={workspaces}
            editors={editors}
            backupsByWorkspace={backupsByWorkspace}
            branding={branding}
            navigate={navigate}
          />
        )}
      </React.Fragment>
    );
  }
}
