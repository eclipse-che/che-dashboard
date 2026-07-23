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

import { DeviceAuthTokensEmptyState } from '@/pages/UserPreferences/DeviceAuthTokens/EmptyState';
import getComponentRenderer, { fireEvent, screen } from '@/services/__mocks__/getComponentRenderer';

const { renderComponent } = getComponentRenderer(getComponent);

describe('DeviceAuthTokensEmptyState', () => {
  it('should render the empty state heading', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: 'No Device Authentication Tokens' })).not.toBeNull();
  });

  it('should render the informational message', () => {
    renderComponent();

    expect(
      screen.getByText(/Connect your GitHub account using device authorization/),
    ).not.toBeNull();
  });

  it('should not render "Connect to GitHub" button when isConnectEnabled is false', () => {
    renderComponent(jest.fn(), false);

    expect(screen.queryByTestId('connect-github-button')).not.toBeInTheDocument();
  });

  it('should call onConnect when "Connect to GitHub" is clicked', () => {
    const onConnect = jest.fn();
    renderComponent(onConnect);
    fireEvent.click(screen.getByTestId('connect-github-button'));
    expect(onConnect).toHaveBeenCalled();
  });
});

function getComponent(
  onConnect: () => void = jest.fn(),
  isConnectEnabled = true,
): React.ReactElement {
  return <DeviceAuthTokensEmptyState onConnect={onConnect} isConnectEnabled={isConnectEnabled} />;
}
