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

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { DeleteConfirmation } from '@/pages/DevfileDetails/DeleteConfirmation';

const mockOnConfirm = jest.fn();
const mockOnClose = jest.fn();

function renderComponent(overrides?: Partial<React.ComponentProps<typeof DeleteConfirmation>>) {
  return render(
    <DeleteConfirmation
      devfileName="test-devfile"
      isOpen={true}
      onConfirm={mockOnConfirm}
      onClose={mockOnClose}
      {...overrides}
    />,
  );
}

describe('DeleteConfirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render the confirmation modal when open', () => {
    renderComponent();
    expect(screen.getByText('Delete Devfile')).toBeDefined();
    expect(
      screen.getByText((_content, element) => {
        return element?.textContent === 'Would you like to delete devfile "test-devfile"?';
      }),
    ).toBeDefined();
  });

  test('should not render the modal content when closed', () => {
    renderComponent({ isOpen: false });
    expect(screen.queryByText('Delete Devfile')).toBeNull();
  });

  test('should render the confirmation checkbox', () => {
    renderComponent();
    expect(screen.getByText('I understand, this operation cannot be reverted.')).toBeDefined();
  });

  test('should have delete button disabled before checking confirmation', () => {
    renderComponent();
    const deleteButton = screen.getByTestId('delete-devfile-button');
    expect(deleteButton).toBeDisabled();
  });

  test('should enable delete button after checking confirmation checkbox', async () => {
    renderComponent();
    const checkbox = screen.getByTestId('confirmation-checkbox');
    await userEvent.click(checkbox);
    const deleteButton = screen.getByTestId('delete-devfile-button');
    expect(deleteButton).not.toBeDisabled();
  });

  test('should call onConfirm and onClose when delete is confirmed', async () => {
    renderComponent();

    const checkbox = screen.getByTestId('confirmation-checkbox');
    await userEvent.click(checkbox);

    const deleteButton = screen.getByTestId('delete-devfile-button');
    await userEvent.click(deleteButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('should call onClose when cancel button is clicked', async () => {
    renderComponent();

    const cancelButton = screen.getByTestId('close-button');
    await userEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });
});
