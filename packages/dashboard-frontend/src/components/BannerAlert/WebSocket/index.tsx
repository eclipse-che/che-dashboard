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

import { api } from '@eclipse-che/common';
import { Banner } from '@patternfly/react-core';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { container } from '@/inversify.config';
import {
  ConnectionEvent,
  ConnectionListener,
  WebsocketClient,
} from '@/services/backend-client/websocketClient';
import { ChannelListener } from '@/services/backend-client/websocketClient/messageHandler';
import { RootState } from '@/store';
import { selectBranding } from '@/store/Branding/selectors';

type Props = MappedProps;

type State = {
  erroringWebSockets: string[];
  watchAuthError: string | undefined;
};

class BannerAlertWebSocket extends React.PureComponent<Props, State> {
  private readonly websocketClient: WebsocketClient;
  private readonly onDidWebsocketFail: ConnectionListener;
  private readonly onDidWebsocketOpen: ConnectionListener;
  private readonly onWatchChannelMessage: ChannelListener;

  constructor(props: Props) {
    super(props);
    this.websocketClient = container.get(WebsocketClient);
    this.state = {
      erroringWebSockets: [],
      watchAuthError: undefined,
    };
    this.onDidWebsocketFail = () => {
      this.setState({
        erroringWebSockets: [this.websocketClient.websocketContext],
      });
    };
    this.onDidWebsocketOpen = () => {
      this.setState({
        erroringWebSockets: [],
        watchAuthError: undefined,
      });
    };
    this.onWatchChannelMessage = (message: api.webSocket.NotificationMessage) => {
      if (api.webSocket.isStatusMessage(message) && message.status.code === 401) {
        this.setState({
          watchAuthError: message.status.message || 'Unauthorized',
        });
      }
    };
  }

  public componentWillUnmount() {
    this.websocketClient.removeConnectionEventListener(
      ConnectionEvent.ERROR,
      this.onDidWebsocketFail,
    );
    this.websocketClient.removeConnectionEventListener(
      ConnectionEvent.OPEN,
      this.onDidWebsocketOpen,
    );
  }

  public componentDidMount() {
    this.websocketClient.addConnectionEventListener(
      ConnectionEvent.ERROR,
      this.onDidWebsocketFail,
      true,
    );
    this.websocketClient.addConnectionEventListener(ConnectionEvent.OPEN, this.onDidWebsocketOpen);

    const channels = [
      api.webSocket.Channel.DEV_WORKSPACE,
      api.webSocket.Channel.EVENT,
      api.webSocket.Channel.POD,
    ];
    for (const channel of channels) {
      this.websocketClient.addChannelMessageListener(channel, this.onWatchChannelMessage);
    }
  }

  render() {
    const { watchAuthError } = this.state;

    if (watchAuthError) {
      return (
        <Banner className="pf-u-text-align-center" variant="danger">
          Dashboard backend lost authorization to watch cluster resources: {watchAuthError}. Try
          refreshing the page or re-logging in.
        </Banner>
      );
    }

    if (this.state.erroringWebSockets.length === 0) {
      return null;
    }

    const webSocketTroubleshootingDocs = this.props.branding.docs.webSocketTroubleshooting;
    return (
      <Banner className="pf-u-text-align-center" status="warning">
        WebSocket connections are failing. Refer to &quot;
        <a href={webSocketTroubleshootingDocs} rel="noreferrer" target="_blank">
          Network Troubleshooting
        </a>
        &quot; in the user guide.
      </Banner>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  branding: selectBranding(state),
});

const connector = connect(mapStateToProps);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(BannerAlertWebSocket);
