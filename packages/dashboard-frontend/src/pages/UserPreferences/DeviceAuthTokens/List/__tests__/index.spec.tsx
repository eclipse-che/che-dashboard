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
import React from 'react';

import { DeviceAuthTokensList } from '@/pages/UserPreferences/DeviceAuthTokens/List';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';

const token1: api.DeviceAuthToken = {
  name: 'device-authentication-secret-abc12',
  creationTimestamp: '2024-01-01T00:00:00.000Z',
};
const token2: api.DeviceAuthToken = {
  name: 'device-authentication-secret-xyz34',
  creationTimestamp: '2024-02-01T00:00:00.000Z',
};

const mockOnDeleteTokens = jest.fn();

const { renderComponent } = getComponentRenderer(
  ({ tokens, isDisabled }: { tokens: api.DeviceAuthToken[]; isDisabled?: boolean }) => (
    <DeviceAuthTokensList
      tokens={tokens}
      isDisabled={isDisabled ?? false}
      onDeleteTokens={mockOnDeleteTokens}
    />
  ),
);

describe('DeviceAuthTokensList', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render token cards', () => {
    renderComponent({ tokens: [token1] });
    expect(screen.getByTestId('device-auth-token-row')).not.toBeNull();
    expect(screen.getByTestId('token-provider')).toHaveTextContent('GitHub');
    expect(screen.getByTestId('token-name')).toHaveTextContent(token1.name);
  });

  it('should render multiple token cards', () => {
    renderComponent({ tokens: [token1, token2] });
    expect(screen.getAllByTestId('device-auth-token-row')).toHaveLength(2);
  });

  it('should render token actions toggle', () => {
    renderComponent({ tokens: [token1] });
    expect(screen.getByTestId('token-actions-toggle')).not.toBeNull();
  });
});
