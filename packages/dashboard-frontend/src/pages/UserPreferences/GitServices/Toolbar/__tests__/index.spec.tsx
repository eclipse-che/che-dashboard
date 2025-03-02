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

import userEvent from '@testing-library/user-event';
import React from 'react';

import { GitServicesToolbar } from '@/pages/UserPreferences/GitServices/Toolbar';
import getComponentRenderer, { screen, waitFor } from '@/services/__mocks__/getComponentRenderer';
import { IGitOauth } from '@/store/GitOauthConfig';

const mockOnRevokeButton = jest.fn();

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

describe('GitServicesToolbar', () => {
  test('snapshot with providers selected', () => {
    const selectedItems: IGitOauth[] = [
      {
        name: 'github',
        endpointUrl: 'https://github.com',
      },
      {
        name: 'gitlab',
        endpointUrl: 'https://gitlab.com',
      },
    ];
    const snapshot = createSnapshot(selectedItems);
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('isDisabled is true', () => {
    renderComponent(
      [
        {
          name: 'github',
          endpointUrl: 'https://github.com',
        },
      ],
      true,
    );

    const revokeButton = screen.getByRole('button', { name: 'Revoke' });
    expect(revokeButton).toBeDisabled();
  });

  test('no providers selected', () => {
    renderComponent([]);

    const revokeButton = screen.getByRole('button', { name: 'Revoke' });
    expect(revokeButton).toBeDisabled();
  });

  test('revoke button click', async () => {
    renderComponent([
      {
        name: 'github',
        endpointUrl: 'https://github.com',
      },
    ]);

    const revokeButton = screen.getByRole('button', { name: 'Revoke' });
    expect(revokeButton).toBeEnabled();

    await userEvent.click(revokeButton);
    await waitFor(() => expect(mockOnRevokeButton).toHaveBeenCalledTimes(1));
  });
});

function getComponent(selectedItems: IGitOauth[], isDisabled = false) {
  return (
    <GitServicesToolbar
      isDisabled={isDisabled}
      selectedItems={selectedItems}
      onRevokeButton={mockOnRevokeButton}
    />
  );
}
