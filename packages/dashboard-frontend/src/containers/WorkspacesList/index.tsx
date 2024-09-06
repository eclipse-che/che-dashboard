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

import { createHashHistory, History } from 'history';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Location, NavigateFunction, useLocation, useNavigate } from 'react-router-dom';

import Fallback from '@/components/Fallback';
import WorkspacesList from '@/pages/WorkspacesList';
import { AppState } from '@/store';
import { selectBranding } from '@/store/Branding/selectors';
import * as WorkspacesStore from '@/store/Workspaces';
import { selectAllWorkspaces, selectIsLoading } from '@/store/Workspaces/selectors';

type Props = MappedProps & {
  history: History;
  location: Location;
  navigate: NavigateFunction;
};

export class WorkspacesListContainer extends React.PureComponent<Props> {
  render() {
    const { branding, history, allWorkspaces, isLoading } = this.props;

    if (isLoading) {
      return Fallback;
    }

    return <WorkspacesList branding={branding} history={history} workspaces={allWorkspaces} />;
  }
}

function ContainerWrapper(props: MappedProps) {
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
    <WorkspacesListContainer {...props} history={history} location={location} navigate={navigate} />
  );
}

const mapStateToProps = (state: AppState) => {
  return {
    branding: selectBranding(state),
    allWorkspaces: selectAllWorkspaces(state),
    isLoading: selectIsLoading(state),
  };
};

const connector = connect(mapStateToProps, WorkspacesStore.actionCreators);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(ContainerWrapper);
