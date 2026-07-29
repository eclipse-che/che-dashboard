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

import { DropdownActions } from '@/pages/DevfileDetails/DropdownActions';

const mockOnCopyLink = jest.fn();
const mockOnDownload = jest.fn();
const mockOnDelete = jest.fn();

function renderComponent() {
  return render(
    <DropdownActions
      onCopyLink={mockOnCopyLink}
      onDownload={mockOnDownload}
      onDelete={mockOnDelete}
    />,
  );
}

describe('DropdownActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render the dropdown toggle button', () => {
    renderComponent();
    expect(screen.getByLabelText('Devfile actions')).toBeDefined();
  });

  test('should show menu items when toggle is clicked', async () => {
    renderComponent();

    const toggleButton = screen.getByLabelText('Devfile actions');
    await userEvent.click(toggleButton);

    expect(screen.getByText('Copy Link')).toBeDefined();
    expect(screen.getByText('Download')).toBeDefined();
    expect(screen.getByText('Delete')).toBeDefined();
  });

  test('should call onCopyLink when Copy Link is clicked', async () => {
    renderComponent();

    const toggleButton = screen.getByLabelText('Devfile actions');
    await userEvent.click(toggleButton);

    const copyLinkItem = screen.getByText('Copy Link');
    await userEvent.click(copyLinkItem);

    expect(mockOnCopyLink).toHaveBeenCalledTimes(1);
  });

  test('should call onDownload when Download is clicked', async () => {
    renderComponent();

    const toggleButton = screen.getByLabelText('Devfile actions');
    await userEvent.click(toggleButton);

    const downloadItem = screen.getByText('Download');
    await userEvent.click(downloadItem);

    expect(mockOnDownload).toHaveBeenCalledTimes(1);
  });

  test('should call onDelete when Delete is clicked', async () => {
    renderComponent();

    const toggleButton = screen.getByLabelText('Devfile actions');
    await userEvent.click(toggleButton);

    const deleteItem = screen.getByText('Delete');
    await userEvent.click(deleteItem);

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });
});
