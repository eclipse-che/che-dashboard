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

import isEqual from 'lodash/isEqual';
import React, { useEffect } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Location, NavigateFunction, useLocation, useNavigate, useParams } from 'react-router-dom';

import { WorkspaceDetails } from '@/pages/WorkspaceDetails';
import { WorkspaceRouteParams } from '@/Routes';
import { buildWorkspacesLocation, toHref } from '@/services/helpers/location';
import { Workspace } from '@/services/workspace-adapter';
import { RootState } from '@/store';
import { selectDefaultNamespace } from '@/store/InfrastructureNamespaces/selectors';
import { workspacesActionCreators } from '@/store/Workspaces';
import { selectAllWorkspaces, selectIsLoading } from '@/store/Workspaces/selectors';

type RouteParams = Partial<WorkspaceRouteParams>;

type Props = MappedProps & {
  routeParams: RouteParams;
  location: Location;
  navigate: NavigateFunction;
};

type State = {
  workspace?: Workspace;
};

class WorkspaceDetailsContainer extends React.Component<Props, State> {
  private readonly workspacesLink: string;

  constructor(props: Props) {
    super(props);

    this.workspacesLink = toHref(buildWorkspacesLocation());

    const workspace = props.allWorkspaces.find(
      workspace =>
        workspace.namespace === props.routeParams.namespace &&
        workspace.name === props.routeParams.workspaceName,
    );

    this.state = {
      workspace,
    };
  }

  public componentDidMount(): void {
    const { routeParams, allWorkspaces, isLoading, requestWorkspaces } = this.props;
    const workspace = allWorkspaces.find(
      workspace =>
        workspace.namespace === routeParams.namespace &&
        workspace.name === routeParams.workspaceName,
    );
    if (!isLoading && !workspace) {
      requestWorkspaces();
    }
  }

  public componentDidUpdate(prevProps: Props): void {
    const namespace = this.props.routeParams.namespace;
    const workspaceName = this.props.routeParams.workspaceName;
    const workspace = this.props.allWorkspaces.find(
      workspace => workspace.namespace === namespace && workspace.name === workspaceName,
    );
    if (!workspace) {
      const workspacesListLocation = buildWorkspacesLocation();
      this.props.navigate(workspacesListLocation);
    } else if (
      this.props.location.pathname !== prevProps.location.pathname ||
      !isEqual(workspace, this.state.workspace)
    ) {
      this.setState({ workspace });
    }
  }

  render() {
    const { location, navigate } = this.props;
    const { workspace } = this.state;

    return (
      <WorkspaceDetails
        location={location}
        navigate={navigate}
        isLoading={this.props.isLoading}
        workspace={workspace}
        workspacesLink={this.workspacesLink}
        onSave={async (workspace: Workspace) => await this.onSave(workspace)}
      />
    );
  }

  async onSave(changedWorkspace: Workspace): Promise<void> {
    await this.props.updateWorkspace(changedWorkspace);
  }
}

function ContainerWrapper(props: MappedProps) {
  const params = useParams<RouteParams>();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const namespace = params.namespace;
    const workspaceName = (params.workspaceName || '').split('&')[0];
    if (workspaceName !== params.workspaceName) {
      const pathname = `/workspace/${namespace}/${workspaceName}`;
      navigate(pathname, { replace: true });
    }
  }, [params, location.pathname, navigate]);

  return (
    <WorkspaceDetailsContainer
      {...props}
      location={location}
      navigate={navigate}
      routeParams={params}
    />
  );
}

const mapStateToProps = (state: RootState) => ({
  allWorkspaces: selectAllWorkspaces(state),
  defaultNamespace: selectDefaultNamespace(state),
  isLoading: selectIsLoading(state),
});

const connector = connect(mapStateToProps, workspacesActionCreators, null, {
  forwardRef: true,
});

type MappedProps = ConnectedProps<typeof connector>;
export default connector(ContainerWrapper);
