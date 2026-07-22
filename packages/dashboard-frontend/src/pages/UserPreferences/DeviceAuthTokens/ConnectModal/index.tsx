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
import {
  Button,
  ButtonVariant,
  Content,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Spinner,
  Tooltip,
} from '@patternfly/react-core';
import { CopyIcon } from '@patternfly/react-icons';
import React from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';
import { connect, ConnectedProps } from 'react-redux';

import {
  DeviceAuthPollResult,
  DeviceCodeResponse,
  pollDeviceAuth,
} from '@/services/backend-client/deviceAuthTokenApi';
import { deviceAuthTokenActionCreators } from '@/store/DeviceAuthToken';

const connector = connect(null, {
  initiateDeviceAuth: deviceAuthTokenActionCreators.initiateDeviceAuth,
});

type MappedProps = ConnectedProps<typeof connector>;

type OwnProps = {
  isOpen: boolean;
  namespace: string;
  onCloseModal: () => void;
  onSuccess: (token: api.DeviceAuthToken) => void;
};

export type Props = OwnProps & MappedProps;

export type State = {
  deviceCode: DeviceCodeResponse | undefined;
  error: string | undefined;
  isLoading: boolean;
  copyTimerId: number | undefined;
};

class ConnectModalClass extends React.PureComponent<Props, State> {
  private pollTimer: ReturnType<typeof setTimeout> | undefined;
  private _isMounted = false;

  constructor(props: Props) {
    super(props);
    this.state = {
      deviceCode: undefined,
      error: undefined,
      isLoading: false,
      copyTimerId: undefined,
    };
  }

  componentDidMount(): void {
    this._isMounted = true;
    if (this.props.isOpen) {
      this.initiateAuth();
    }
  }

  componentDidUpdate(prevProps: Props): void {
    if (this.props.isOpen && !prevProps.isOpen) {
      void this.initiateAuth();
    }
    if (!this.props.isOpen && prevProps.isOpen) {
      this.stopPolling();
    }
  }

  componentWillUnmount(): void {
    this._isMounted = false;
    this.stopPolling();
  }

  private async initiateAuth(): Promise<void> {
    if (this.state.isLoading) {
      return;
    }
    this.setState({ deviceCode: undefined, error: undefined, isLoading: true });
    try {
      const result = await this.props.initiateDeviceAuth();
      this.setState({ deviceCode: result, isLoading: false });
      this.schedulePoll(result);
    } catch (e) {
      this.setState({ error: String(e), isLoading: false });
    }
  }

  private handleCopyToClipboard(): void {
    let { copyTimerId } = this.state;
    if (copyTimerId !== undefined) {
      window.clearTimeout(copyTimerId);
    }
    copyTimerId = window.setTimeout(() => {
      this.setState({ copyTimerId: undefined });
    }, 3000);
    this.setState({ copyTimerId });
  }

  private schedulePoll(response: DeviceCodeResponse): void {
    this.pollTimer = setTimeout(() => this.runPoll(response), response.interval * 1000);
  }

  private async runPoll(response: DeviceCodeResponse): Promise<void> {
    const { namespace } = this.props;
    let result: DeviceAuthPollResult;
    try {
      // pollDeviceAuth is called directly (not through a Redux thunk) to avoid
      // storing high-frequency polling results in Redux state. Network/session
      // errors are caught below and retried via the next scheduled poll.
      result = await pollDeviceAuth(namespace, response.deviceCode);
    } catch {
      if (!this._isMounted) {
        return;
      }
      this.schedulePoll(response);
      return;
    }
    if (!this._isMounted) {
      return;
    }
    if (result.status === 'pending') {
      this.schedulePoll(response);
    } else if (result.status === 'slow_down') {
      // RFC 8628 §3.5: increase interval by 5s on slow_down
      this.schedulePoll({ ...response, interval: response.interval + 5 });
    } else if (result.status === 'authorized') {
      this.props.onSuccess(result.token);
    } else if (result.status === 'expired') {
      this.setState({ error: 'The code has expired. Please try again.' });
    } else {
      this.setState({ error: result.message });
    }
  }

  private stopPolling(): void {
    if (this.pollTimer !== undefined) {
      clearTimeout(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  private handleClose(): void {
    this.stopPolling();
    this.props.onCloseModal();
  }

  public render(): React.ReactElement {
    const { isOpen } = this.props;
    const { deviceCode, error, isLoading } = this.state;
    const modalTitle = 'Connect to GitHub';

    return (
      <Modal
        aria-label={modalTitle}
        variant={ModalVariant.small}
        isOpen={isOpen}
        onClose={() => this.handleClose()}
      >
        <ModalHeader title={modalTitle} />
        <ModalBody>
          {isLoading && <Spinner size="md" />}
          {error && (
            <Content
              data-testid="connect-error"
              style={{ color: 'var(--pf-t--global--color--status--danger--default)' }}
            >
              {error}
            </Content>
          )}
          {deviceCode && !error && (
            <Content>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Content component="p" style={{ margin: 0, whiteSpace: 'nowrap' }}>
                  Your one-time code:
                </Content>
                <code
                  data-testid="user-code"
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    letterSpacing: '0.15em',
                  }}
                >
                  {deviceCode.userCode}
                </code>
                <Tooltip content={this.state.copyTimerId ? 'Copied!' : 'Copy to clipboard'}>
                  <CopyToClipboard
                    text={deviceCode.userCode}
                    onCopy={() => this.handleCopyToClipboard()}
                  >
                    <Button
                      variant={ButtonVariant.plain}
                      icon={<CopyIcon />}
                      aria-label="Copy to clipboard"
                      data-testid="copy-to-clipboard"
                    />
                  </CopyToClipboard>
                </Tooltip>
              </div>
              <Content component="ol" style={{ marginTop: '1rem' }}>
                <Content component="li">Copy the code above</Content>
                <Content component="li">
                  Open{' '}
                  <a href={deviceCode.verificationUri} target="_blank" rel="noreferrer">
                    {deviceCode.verificationUri}
                  </a>{' '}
                  and paste the code
                </Content>
                <Content component="li">Return here — the page will update automatically</Content>
              </Content>
            </Content>
          )}
        </ModalBody>
        <ModalFooter>
          {deviceCode && !error && (
            <CopyToClipboard
              text={deviceCode.userCode}
              onCopy={() => window.open(deviceCode.verificationUri, '_blank')}
            >
              <Button variant={ButtonVariant.primary} data-testid="copy-continue-button">
                Copy &amp; Continue to Browser
              </Button>
            </CopyToClipboard>
          )}
          <Button
            variant={ButtonVariant.link}
            onClick={() => this.handleClose()}
            data-testid="cancel-button"
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}

export const ConnectModal = connector(ConnectModalClass);
export default ConnectModal;
