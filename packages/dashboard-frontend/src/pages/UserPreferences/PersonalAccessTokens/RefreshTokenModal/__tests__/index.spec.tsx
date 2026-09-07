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

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { api } from '@eclipse-che/common';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { token1 } from '@/pages/UserPreferences/PersonalAccessTokens/RefreshTokenModal/__tests__/stub';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';

import { PersonalAccessTokenRefreshModal } from '..';

const { renderComponent } = getComponentRenderer(getComponent);

const mockOnCloseModal = jest.fn();
const mockOnRefresh = jest.fn();

describe('RefreshTokenModal', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('modal is hidden', () => {
    renderComponent(false, token1);

    expect(screen.queryByRole('dialog')).toBeFalsy();
  });

  test('modal is visible', () => {
    renderComponent(true, token1);

    expect(screen.queryByRole('dialog')).toBeTruthy();
    expect(screen.queryAllByText('Refresh oAuth token').length).toBeGreaterThan(0);
    expect(screen.queryByText('Request a new oAuth token')).toBeTruthy();
  });

  it('should handle click on Cancel button', async () => {
    renderComponent(true, token1);

    const cancelButton = screen.queryByRole('button', { name: 'Cancel' });
    expect(cancelButton).toBeTruthy();

    await userEvent.click(cancelButton!);
    expect(mockOnCloseModal).toHaveBeenCalledTimes(1);
  });

  it('should handle click on Ok button', async () => {
    renderComponent(true, token1);

    const okButton = screen.queryByRole('button', { name: 'Ok' });
    expect(okButton).toBeTruthy();

    await userEvent.click(okButton!);
    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    expect(mockOnRefresh).toHaveBeenCalledWith(token1);
  });
});

function getComponent(
  isOpen: boolean,
  token: api.PersonalAccessToken | undefined,
): React.ReactElement {
  return (
    <PersonalAccessTokenRefreshModal
      isOpen={isOpen}
      token={token}
      onCloseModal={mockOnCloseModal}
      onRefresh={mockOnRefresh}
    />
  );
}
