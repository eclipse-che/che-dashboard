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

import userEvent from '@testing-library/user-event';
import React from 'react';

import { GitServicesDeleteModal } from '@/pages/UserPreferences/GitServices/DeleteModal';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';
import { IGitOauth } from '@/store/GitOauthConfig';

const mockOnDelete = jest.fn();
const mockOnCloseModal = jest.fn();

const { renderComponent } = getComponentRenderer(getComponent);

const github: IGitOauth = {
  name: 'github',
  endpointUrl: 'https://github.com',
};

describe('Delete Git Service Token Modal', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('modal is hidden', () => {
    renderComponent(github, false);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('modal is shown', async () => {
    renderComponent(github);

    expect(await screen.findByRole('dialog')).not.toBeNull();
  });

  test('dialog text', () => {
    renderComponent(github);

    const dialogContent = screen.getByTestId('delete-modal-content');
    expect(dialogContent).toHaveTextContent(
      'Would you like to delete the OAuth token for git service "GitHub"?',
    );
  });

  test('dialog text without a service', () => {
    renderComponent(undefined);

    const dialogContent = screen.getByTestId('delete-modal-content');
    expect(dialogContent).toHaveTextContent(
      'Would you like to delete the OAuth token for git service ""?',
    );
  });

  test('Cancel button', async () => {
    renderComponent(github);

    await userEvent.click(screen.getByTestId('cancel-button'));

    expect(mockOnCloseModal).toHaveBeenCalled();
  });

  describe('"I understand" checkbox', () => {
    test('with Cancel afterwards', async () => {
      renderComponent(github);

      const checkbox = screen.getByTestId('warning-info-checkbox');

      // not checked by default
      expect(checkbox).not.toBeChecked();

      await userEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      await userEvent.click(screen.getByTestId('cancel-button'));

      expect(checkbox).not.toBeChecked();
    });

    test('with Delete afterwards', async () => {
      renderComponent(github);

      const checkbox = screen.getByTestId('warning-info-checkbox');

      // not checked by default
      expect(checkbox).not.toBeChecked();

      await userEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      await userEvent.click(screen.getByTestId('delete-button'));

      expect(checkbox).not.toBeChecked();
    });
  });

  test('Delete button', async () => {
    renderComponent(github);

    const deleteButton = screen.getByTestId('delete-button');

    // disabled by default
    expect(deleteButton).toBeDisabled();

    await userEvent.click(screen.getByTestId('warning-info-checkbox'));

    expect(deleteButton).toBeEnabled();

    await userEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalled();
  });
});

function getComponent(deleteItem: IGitOauth | undefined, isOpen = true) {
  return (
    <GitServicesDeleteModal
      isOpen={isOpen}
      deleteItem={deleteItem}
      onCloseModal={mockOnCloseModal}
      onDelete={mockOnDelete}
    />
  );
}
