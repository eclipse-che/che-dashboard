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

import { api } from '@eclipse-che/common';
import { Banner } from '@patternfly/react-core';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { container } from '@/inversify.config';
import { WebsocketClient } from '@/services/backend-client/websocketClient';
import { ChannelListener } from '@/services/backend-client/websocketClient/messageHandler';
import { AppState } from '@/store';
import { selectBranding } from '@/store/Branding/selectors';
type Props = MappedProps;

type State = {
  startingWorkspaces: string[];
};

class BannerAlertNoNodeAvailable extends React.PureComponent<Props, State> {
  private readonly websocketClient: WebsocketClient;

  constructor(props: Props) {
    super(props);
    this.websocketClient = container.get(WebsocketClient);
    this.state = {
      startingWorkspaces: [],
    };
  }

  public async componentDidMount() {
    const devWorkspaceListener: ChannelListener = message => {
      const devWorkspace = (message as api.webSocket.DevWorkspaceMessage).devWorkspace;
      if (devWorkspace.status === undefined) {
        return;
      } else if (
        devWorkspace.status.phase === 'Running' &&
        this.state.startingWorkspaces.length > 0
      ) {
        this.setState({ startingWorkspaces: [] });
      }
    };
    const eventListener: ChannelListener = message => {
      const event = (message as api.webSocket.EventMessage).event;
      if (event.reason === undefined || event.message === undefined) {
        return;
      } else if (
        event.reason === 'FailedScheduling' &&
        event.message.indexOf('No preemption victims found for incoming pod') > -1
      ) {
        this.setState({ startingWorkspaces: [event.metadata!.uid!] });
      }
    };
    this.websocketClient.addChannelMessageListener(api.webSocket.Channel.EVENT, eventListener);
    this.websocketClient.addChannelMessageListener(
      api.webSocket.Channel.DEV_WORKSPACE,
      devWorkspaceListener,
    );
  }

  render() {
    if (this.state.startingWorkspaces.length === 0) {
      return null;
    }

    return (
      <Banner className="pf-u-text-align-center" variant="warning">
        Cluster autoscaler is provisioning a new node at the moment. Please be patient, workspace
        startup will be taking longer than usual.
      </Banner>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  branding: selectBranding(state),
});

const connector = connect(mapStateToProps);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(BannerAlertNoNodeAvailable);
