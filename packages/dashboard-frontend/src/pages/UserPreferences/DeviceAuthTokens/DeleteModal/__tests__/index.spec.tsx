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

import { DeviceAuthTokensDeleteModal } from '@/pages/UserPreferences/DeviceAuthTokens/DeleteModal';
import getComponentRenderer, { fireEvent, screen } from '@/services/__mocks__/getComponentRenderer';

const token: api.DeviceAuthToken = {
  name: 'device-authentication-secret-abc12',
  creationTimestamp: '2024-01-01T00:00:00.000Z',
};
const token2: api.DeviceAuthToken = {
  name: 'device-authentication-secret-xyz34',
  creationTimestamp: '2024-02-01T00:00:00.000Z',
};

const mockOnDelete = jest.fn();
const mockOnClose = jest.fn();

const { renderComponent } = getComponentRenderer(
  ({ isOpen, tokens }: { isOpen: boolean; tokens: api.DeviceAuthToken[] }) => (
    <DeviceAuthTokensDeleteModal
      isOpen={isOpen}
      tokens={tokens}
      onCloseModal={mockOnClose}
      onDelete={mockOnDelete}
    />
  ),
);

describe('DeviceAuthTokensDeleteModal', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when closed', () => {
    renderComponent({ isOpen: false, tokens: [token] });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('should render when open with a single token', () => {
    renderComponent({ isOpen: true, tokens: [token] });
    expect(screen.queryByRole('dialog')).not.toBeNull();
    expect(screen.getByText(/Delete Device Authentication Token/)).not.toBeNull();
  });

  it('should render a bulk title when multiple tokens', () => {
    renderComponent({ isOpen: true, tokens: [token, token2] });
    expect(screen.getByText(/Delete 2 Device Authentication Tokens/)).not.toBeNull();
  });

  it('should call onCloseModal when Cancel is clicked', () => {
    renderComponent({ isOpen: true, tokens: [token] });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should have Delete button disabled until checkbox is checked', () => {
    renderComponent({ isOpen: true, tokens: [token] });
    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    expect(deleteButton).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(deleteButton).not.toBeDisabled();
  });

  it('should call onDelete with tokens array when Delete button is clicked', () => {
    renderComponent({ isOpen: true, tokens: [token] });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(mockOnDelete).toHaveBeenCalledWith([token]);
  });
});
