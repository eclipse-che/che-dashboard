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

import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { KeyIcon } from '@patternfly/react-icons';
import React from 'react';

export type Props = {
  onConnect: () => void;
  isConnectEnabled: boolean;
};

export class DeviceAuthTokensEmptyState extends React.PureComponent<Props> {
  public render(): React.ReactElement {
    return (
      <EmptyState
        isFullHeight={true}
        variant={EmptyStateVariant.sm}
        icon={KeyIcon}
        titleText="No Device Authentication Tokens"
      >
        <EmptyStateBody>
          Connect your GitHub account using device authorization to allow workspaces to clone
          private repositories and interact with the GitHub API.
        </EmptyStateBody>
        {this.props.isConnectEnabled && (
          <EmptyStateFooter>
            <Button
              variant="primary"
              data-testid="connect-github-button"
              onClick={this.props.onConnect}
            >
              Connect to GitHub
            </Button>
          </EmptyStateFooter>
        )}
      </EmptyState>
    );
  }
}
