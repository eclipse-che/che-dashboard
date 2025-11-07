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
import { Navigate } from 'react-router-dom';

import { ROUTE } from '@/Routes/index';
import { RootState } from '@/store';
import { selectAllWorkspaces } from '@/store/Workspaces';

type Props = MappedProps;

class NavigateHome extends React.PureComponent<Props> {
  public render(): React.ReactElement {
    const workspacesNumber = this.props.allWorkspaces.length;
    if (workspacesNumber === 0) {
      return <Navigate key="redirect-to-home" to={ROUTE.GET_STARTED} />;
    }
    return <Navigate key="redirect-to-home" to={ROUTE.WORKSPACES} />;
  }
}

const mapStateToProps = (state: RootState) => ({
  allWorkspaces: selectAllWorkspaces(state),
});
const connector = connect(mapStateToProps);

type MappedProps = ConnectedProps<typeof connector>;

export default connector(NavigateHome);
