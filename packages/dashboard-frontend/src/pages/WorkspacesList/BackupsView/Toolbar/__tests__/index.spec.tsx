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

import { BackupsListToolbar } from '..';

const mockOnFilterChange = jest.fn();
const mockOnFilterApply = jest.fn();
const mockOnFilterClear = jest.fn();
const mockOnRestoreClick = jest.fn();

describe('Backups List Toolbar', () => {
  function renderComponent(
    propsOverrides: Partial<React.ComponentProps<typeof BackupsListToolbar>> = {},
  ) {
    const defaultProps: React.ComponentProps<typeof BackupsListToolbar> = {
      filterValue: '',
      onFilterChange: mockOnFilterChange,
      onFilterApply: mockOnFilterApply,
      onFilterClear: mockOnFilterClear,
      onRestoreClick: mockOnRestoreClick,
    };
    return render(<BackupsListToolbar {...defaultProps} {...propsOverrides} />);
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    renderComponent();

    expect(screen.queryByRole('searchbox')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /search backups/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /restore from backup/i })).toBeTruthy();
  });

  it('should call onFilterChange when typing in search', async () => {
    renderComponent();

    const searchbox = screen.getByRole('searchbox');
    await userEvent.type(searchbox, 'a');

    expect(mockOnFilterChange).toHaveBeenCalledWith('a');
  });

  it('should call onFilterApply when clicking search button', async () => {
    renderComponent();

    const searchButton = screen.getByRole('button', { name: /search backups/i });
    await userEvent.click(searchButton);

    expect(mockOnFilterApply).toHaveBeenCalled();
  });

  it('should call onFilterApply when pressing Enter', async () => {
    renderComponent();

    const searchbox = screen.getByRole('searchbox');
    await userEvent.type(searchbox, '{Enter}');

    expect(mockOnFilterApply).toHaveBeenCalled();
  });

  it('should call onFilterClear when pressing Escape', async () => {
    renderComponent();

    const searchbox = screen.getByRole('searchbox');
    await userEvent.type(searchbox, '{Escape}');

    expect(mockOnFilterClear).toHaveBeenCalled();
  });

  it('should call onRestoreClick when clicking Restore Workspace', async () => {
    renderComponent();

    const restoreButton = screen.getByRole('button', { name: /restore from backup/i });
    await userEvent.click(restoreButton);

    expect(mockOnRestoreClick).toHaveBeenCalled();
  });
});
