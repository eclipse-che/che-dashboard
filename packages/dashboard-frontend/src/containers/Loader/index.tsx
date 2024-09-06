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
import { createHashHistory, History } from 'history';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Location, NavigateFunction, useLocation, useNavigate, useParams } from 'react-router-dom';

import { LoaderPage } from '@/pages/Loader';
import { WorkspaceRouteParams } from '@/Routes';
import { findTargetWorkspace } from '@/services/helpers/factoryFlow/findTargetWorkspace';
import { getLoaderMode } from '@/services/helpers/factoryFlow/getLoaderMode';
import { LoaderTab } from '@/services/helpers/types';
import { Workspace } from '@/services/workspace-adapter';
import { AppState } from '@/store';
import { selectAllWorkspaces } from '@/store/Workspaces/selectors';

type RouteParams = Partial<WorkspaceRouteParams> | undefined;

export type Props = MappedProps & {
  routeParams: RouteParams;
  history: History;
  location: Location;
  navigate: NavigateFunction;
};

export type State = {
  searchParams: URLSearchParams;
  tabParam: string | undefined;
};

class LoaderContainer extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    const dirtyLocation = this.props.location;
    const { search } = helpers.sanitizeLocation(dirtyLocation);
    const searchParams = new URLSearchParams(search);
    const tabParam = searchParams.get('tab') || undefined;

    this.state = {
      searchParams,
      tabParam,
    };
  }

  private findTargetWorkspace(props: Props): Workspace | undefined {
    const loaderMode = getLoaderMode(props.location);
    if (loaderMode.mode !== 'workspace') {
      return;
    }
    return findTargetWorkspace(props.allWorkspaces, loaderMode.workspaceParams);
  }

  private handleTabChange(tab: LoaderTab): void {
    this.setState({
      tabParam: tab,
    });

    const { location } = this.props;
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('tab', LoaderTab[tab]);
    location.search = searchParams.toString();
    this.props.history.push(location);
  }

  render(): React.ReactElement {
    const { history } = this.props;
    const { tabParam, searchParams } = this.state;

    const workspace = this.findTargetWorkspace(this.props);

    return (
      <LoaderPage
        history={history}
        tabParam={tabParam}
        searchParams={searchParams}
        workspace={workspace}
        onTabChange={tab => this.handleTabChange(tab)}
      />
    );
  }
}

function ContainerWrapper(props: MappedProps) {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Create a history-like object
  // todo - this is a workaround for the fact that we can't pass a history object to the component
  // todo get rid of this when we have a better solution
  const history: History = {
    ...createHashHistory(),
    push: navigate,
    replace: path => navigate(path, { replace: true }),
    location,
  };

  return (
    <LoaderContainer
      {...props}
      history={history}
      location={location}
      navigate={navigate}
      routeParams={params}
    />
  );
}

const mapStateToProps = (state: AppState) => ({
  allWorkspaces: selectAllWorkspaces(state),
});

const connector = connect(mapStateToProps, null, null, {
  // forwardRef is mandatory for using `@react-mock/state` in unit tests
  forwardRef: true,
});
type MappedProps = ConnectedProps<typeof connector>;
export default connector(ContainerWrapper);
