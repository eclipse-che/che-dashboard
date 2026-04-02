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

import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Location, NavigateFunction, useLocation, useNavigate } from 'react-router-dom';

import Fallback from '@/components/Fallback';
import WorkspacesList from '@/pages/WorkspacesList';
import { RootState } from '@/store';
import { selectAiTools } from '@/store/AiConfig/selectors';
import { fetchBackupConfig, fetchWorkspaceBackupStatus } from '@/store/Backups/actions';
import { selectAllBackupsByWorkspace, selectBackupConfig } from '@/store/Backups/selectors';
import { selectBranding } from '@/store/Branding/selectors';
import { selectCmEditors } from '@/store/Plugins/devWorkspacePlugins/selectors';
import { workspacesActionCreators } from '@/store/Workspaces';
import { selectAllWorkspaces, selectIsLoading } from '@/store/Workspaces/selectors';

type Props = MappedProps & {
  location: Location;
  navigate: NavigateFunction;
};

export class WorkspacesListContainer extends React.PureComponent<Props> {
  componentDidMount() {
    const namespace = this.props.allWorkspaces[0]?.namespace;
    if (namespace) {
      this.props.fetchBackupConfig({ namespace });
    }
    this.fetchBackupStatuses();
  }

  componentDidUpdate(prevProps: Props) {
    const prevUIDs = prevProps.allWorkspaces
      .map(w => w.uid)
      .sort()
      .join(',');
    const currUIDs = this.props.allWorkspaces
      .map(w => w.uid)
      .sort()
      .join(',');
    if (
      prevUIDs !== currUIDs ||
      prevProps.backupConfig?.registry !== this.props.backupConfig?.registry
    ) {
      this.fetchBackupStatuses();
    }
  }

  private fetchBackupStatuses() {
    const { allWorkspaces, backupConfig, backupsByWorkspace } = this.props;
    if (!backupConfig?.registry) {
      return;
    }
    allWorkspaces.forEach(workspace => {
      if (!backupsByWorkspace[workspace.uid]) {
        this.props.fetchWorkspaceBackupStatus({
          namespace: workspace.namespace,
          workspaceUID: workspace.uid,
          workspaceName: workspace.name,
        });
      }
    });
  }

  render() {
    const {
      aiTools,
      backupConfig,
      branding,
      allWorkspaces,
      backupsByWorkspace,
      editors,
      isLoading,
      location,
      navigate,
    } = this.props;

    if (isLoading) {
      return Fallback;
    }

    return (
      <WorkspacesList
        backupConfig={backupConfig}
        branding={branding}
        editors={editors}
        location={location}
        navigate={navigate}
        workspaces={allWorkspaces}
        aiTools={aiTools}
        backupsByWorkspace={backupsByWorkspace}
      />
    );
  }
}

function ContainerWrapper(props: MappedProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return <WorkspacesListContainer {...props} location={location} navigate={navigate} />;
}

const mapStateToProps = (state: RootState) => {
  return {
    backupConfig: selectBackupConfig(state),
    branding: selectBranding(state),
    allWorkspaces: selectAllWorkspaces(state),
    backupsByWorkspace: selectAllBackupsByWorkspace(state),
    editors: selectCmEditors(state),
    isLoading: selectIsLoading(state),
    aiTools: selectAiTools(state),
  };
};

const mapDispatchToProps = {
  ...workspacesActionCreators,
  fetchBackupConfig,
  fetchWorkspaceBackupStatus,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(ContainerWrapper);
