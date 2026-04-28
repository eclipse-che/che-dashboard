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

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import DevfilesList from '@/pages/DevfilesList';
import { LocalDevfile } from '@/store/LocalDevfiles';

jest.mock('@/components/Head', () => {
  return function MockHead() {
    return null;
  };
});
jest.mock('@/components/Progress', () => {
  return function MockProgress(props: { isLoading: boolean }) {
    return props.isLoading ? <div data-testid="progress-indicator">Loading...</div> : null;
  };
});

jest.mock('@/pages/DevfileDetails/DeleteConfirmation', () => ({
  DeleteConfirmation: function MockDeleteConfirmation(props: {
    devfileName: string;
    isOpen: boolean;
    onConfirm: () => void;
    onClose: () => void;
  }) {
    return (
      <div data-testid="delete-confirmation" data-is-open={String(props.isOpen)}>
        <span data-testid="delete-confirmation-name">{props.devfileName}</span>
        <button data-testid="mock-confirm-btn" onClick={props.onConfirm}>
          Confirm
        </button>
        <button data-testid="mock-close-btn" onClick={props.onClose}>
          Close
        </button>
      </div>
    );
  },
}));

const mockDevfiles: LocalDevfile[] = [
  {
    id: 'devfile-1',
    name: 'Alpha Devfile',
    description: 'First test devfile',
    content: 'schemaVersion: 2.2.0\nmetadata:\n  name: alpha-devfile\n',
    projectNames: ['project-a'],
    lastModified: '2026-01-01T00:00:00Z',
  },
  {
    id: 'devfile-2',
    name: 'Beta Devfile',
    description: 'Second test devfile',
    content: 'schemaVersion: 2.2.0\nmetadata:\n  name: beta-devfile\n',
    projectNames: ['project-b', 'project-c'],
    lastModified: '2026-01-02T00:00:00Z',
  },
  {
    id: 'devfile-3',
    name: 'Gamma Devfile',
    description: '',
    content: 'schemaVersion: 2.2.0\nmetadata:\n  name: gamma-devfile\n',
    projectNames: [],
    lastModified: '2026-01-03T00:00:00Z',
  },
];

const mockNavigate = jest.fn();
const mockOnDeleteDevfile = jest.fn();
const mockOnCreateDevfile = jest.fn().mockResolvedValue('new-id');

function renderComponent(overrides?: Partial<React.ComponentProps<typeof DevfilesList>>) {
  return render(
    <DevfilesList
      devfiles={mockDevfiles}
      defaultDevfileContent={undefined}
      error={undefined}
      isLoading={false}
      namespace="test-namespace"
      navigate={mockNavigate}
      onCreateDevfile={mockOnCreateDevfile}
      onDeleteDevfile={mockOnDeleteDevfile}
      {...overrides}
    />,
  );
}

describe('DevfilesList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    test('should render the page heading', () => {
      renderComponent();
      expect(screen.getByRole('heading', { name: 'Devfiles', level: 1 })).toBeInTheDocument();
    });

    test('should render the description text', () => {
      renderComponent();
      expect(screen.getByText(/Create and manage local devfiles/)).toBeInTheDocument();
    });

    test('should render Add Devfile toolbar button', () => {
      renderComponent();
      const buttons = screen.getAllByRole('button', { name: /Add Devfile/i });
      expect(buttons.length).toBeGreaterThan(0);
    });

    test('should render the Devfiles List Table', () => {
      renderComponent();
      expect(screen.getByLabelText('Devfiles List Table')).toBeInTheDocument();
    });

    test('should render table column headers', () => {
      renderComponent();
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
    });

    test('should render devfile entries in the table', () => {
      renderComponent();
      expect(screen.getByText('Alpha Devfile')).toBeInTheDocument();
      expect(screen.getByText('Beta Devfile')).toBeInTheDocument();
      expect(screen.getByText('Gamma Devfile')).toBeInTheDocument();
    });

    test('should render devfile IDs', () => {
      renderComponent();
      expect(screen.getByText('devfile-1')).toBeInTheDocument();
      expect(screen.getByText('devfile-2')).toBeInTheDocument();
      expect(screen.getByText('devfile-3')).toBeInTheDocument();
    });

    test('should render devfile descriptions', () => {
      renderComponent();
      expect(screen.getByText('First test devfile')).toBeInTheDocument();
      expect(screen.getByText('Second test devfile')).toBeInTheDocument();
    });

    test('should render dash for empty description', () => {
      renderComponent();
      // Gamma Devfile has empty description, should show '-'
      const rows = screen.getAllByRole('row');
      // Find the row with Gamma Devfile
      const gammaRow = rows.find(row => within(row).queryByText('Gamma Devfile') !== null);
      expect(gammaRow).toBeDefined();
      expect(within(gammaRow!).getAllByText('-').length).toBeGreaterThan(0);
    });

    test('should render project names', () => {
      renderComponent();
      expect(screen.getByText('project-a')).toBeInTheDocument();
      expect(screen.getByText('project-b, project-c')).toBeInTheDocument();
    });

    test('should render dash for empty project names', () => {
      renderComponent();
      const rows = screen.getAllByRole('row');
      const gammaRow = rows.find(row => within(row).queryByText('Gamma Devfile') !== null);
      expect(gammaRow).toBeDefined();
      // Gamma has empty projectNames, so it should show '-' for projects
      const dashes = within(gammaRow!).getAllByText('-');
      // At least 2 dashes: one for description and one for projects
      expect(dashes.length).toBe(2);
    });
  });

  describe('progress indicator', () => {
    test('should show ProgressIndicator when loading', () => {
      renderComponent({ isLoading: true });
      expect(screen.getByTestId('progress-indicator')).toBeInTheDocument();
    });

    test('should not show ProgressIndicator when not loading', () => {
      renderComponent({ isLoading: false });
      expect(screen.queryByTestId('progress-indicator')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    test('should show empty state when no devfiles', () => {
      renderComponent({ devfiles: [] });
      expect(screen.getByText('No Devfiles')).toBeInTheDocument();
    });

    test('should show Add Devfile button in empty state', () => {
      renderComponent({ devfiles: [] });
      const buttons = screen.getAllByRole('button', { name: /Add Devfile/i });
      expect(buttons.length).toBeGreaterThan(0);
    });

    test('should not show filter input in empty state', () => {
      renderComponent({ devfiles: [] });
      expect(screen.queryByLabelText('Filter devfiles')).not.toBeInTheDocument();
    });

    test('should not show delete button in empty state', () => {
      renderComponent({ devfiles: [] });
      expect(
        screen.queryByRole('button', { name: /Delete selected devfiles/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('Add Devfile modal', () => {
    test('should open modal when Add Devfile button is clicked', async () => {
      renderComponent();
      const addButton = screen.getAllByRole('button', { name: /Add Devfile/i })[0];
      await userEvent.click(addButton);
      expect(screen.getByPlaceholderText('my-devfile')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Optional description for this devfile'),
      ).toBeInTheDocument();
    });

    test('should have Create button disabled when name is empty', async () => {
      renderComponent();
      const addButton = screen.getAllByRole('button', { name: /Add Devfile/i })[0];
      await userEvent.click(addButton);
      const createButton = screen.getByRole('button', { name: 'Create' });
      expect(createButton).toBeDisabled();
    });

    test('should enable Create button when name is provided', async () => {
      renderComponent();
      const addButton = screen.getAllByRole('button', { name: /Add Devfile/i })[0];
      await userEvent.click(addButton);
      const nameInput = screen.getByPlaceholderText('my-devfile');
      await userEvent.type(nameInput, 'new-devfile');
      const createButton = screen.getByRole('button', { name: 'Create' });
      expect(createButton).toBeEnabled();
    });

    test('should show validation error for whitespace-only name', async () => {
      renderComponent();
      const addButton = screen.getAllByRole('button', { name: /Add Devfile/i })[0];
      await userEvent.click(addButton);
      const nameInput = screen.getByPlaceholderText('my-devfile');
      await userEvent.type(nameInput, 'a');
      await userEvent.clear(nameInput);
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });

    test('should close modal when Cancel is clicked', async () => {
      renderComponent();
      const addButton = screen.getAllByRole('button', { name: /Add Devfile/i })[0];
      await userEvent.click(addButton);
      expect(screen.getByPlaceholderText('my-devfile')).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await userEvent.click(cancelButton);
      expect(screen.queryByPlaceholderText('my-devfile')).not.toBeInTheDocument();
    });

    test('should call onCreateDevfile and navigate on successful creation', async () => {
      renderComponent();
      const addButton = screen.getAllByRole('button', { name: /Add Devfile/i })[0];
      await userEvent.click(addButton);

      const nameInput = screen.getByPlaceholderText('my-devfile');
      await userEvent.type(nameInput, 'test-devfile');

      const descInput = screen.getByPlaceholderText('Optional description for this devfile');
      await userEvent.type(descInput, 'A test description');

      const createButton = screen.getByRole('button', { name: 'Create' });
      await userEvent.click(createButton);

      expect(mockOnCreateDevfile).toHaveBeenCalledWith(
        'test-devfile',
        'A test description',
        expect.stringContaining('test-devfile'),
      );
      expect(mockNavigate).toHaveBeenCalledWith('/devfile/test-namespace/new-id');
    });

    test('should use DEVFILE_FALLBACK when defaultDevfileContent is undefined', async () => {
      renderComponent({ defaultDevfileContent: undefined });
      const addButton = screen.getAllByRole('button', { name: /Add Devfile/i })[0];
      await userEvent.click(addButton);

      const nameInput = screen.getByPlaceholderText('my-devfile');
      await userEvent.type(nameInput, 'my-name');
      const createButton = screen.getByRole('button', { name: 'Create' });
      await userEvent.click(createButton);

      expect(mockOnCreateDevfile).toHaveBeenCalledWith(
        'my-name',
        '',
        expect.stringContaining('schemaVersion: 2.2.0'),
      );
    });

    test('should use provided defaultDevfileContent', async () => {
      const customContent =
        'schemaVersion: 2.2.0\nmetadata:\n  generateName: custom-\ncomponents:\n  - name: tools\n';
      renderComponent({ defaultDevfileContent: customContent });
      const addButton = screen.getAllByRole('button', { name: /Add Devfile/i })[0];
      await userEvent.click(addButton);

      const nameInput = screen.getByPlaceholderText('my-devfile');
      await userEvent.type(nameInput, 'my-name');
      const createButton = screen.getByRole('button', { name: 'Create' });
      await userEvent.click(createButton);

      expect(mockOnCreateDevfile).toHaveBeenCalledWith(
        'my-name',
        '',
        expect.stringContaining('components:'),
      );
    });

    test('should handle create devfile failure gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockOnCreateDevfile.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();
      const addButton = screen.getAllByRole('button', { name: /Add Devfile/i })[0];
      await userEvent.click(addButton);

      const nameInput = screen.getByPlaceholderText('my-devfile');
      await userEvent.type(nameInput, 'failing-devfile');
      const createButton = screen.getByRole('button', { name: 'Create' });
      await userEvent.click(createButton);

      expect(consoleError).toHaveBeenCalledWith('Failed to create devfile:', expect.anything());
      expect(mockNavigate).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });

    test('should handle description input changes', async () => {
      renderComponent();
      const addButton = screen.getAllByRole('button', { name: /Add Devfile/i })[0];
      await userEvent.click(addButton);
      const descInput = screen.getByPlaceholderText('Optional description for this devfile');
      await userEvent.type(descInput, 'New description');
      expect(descInput).toHaveValue('New description');
    });
  });

  describe('filtering', () => {
    test('should render filter input when devfiles exist', () => {
      renderComponent();
      expect(screen.getByLabelText('Filter devfiles')).toBeInTheDocument();
    });

    test('should filter devfiles by name', async () => {
      renderComponent();
      const filterInput = screen.getByLabelText('Filter devfiles');
      await userEvent.type(filterInput, 'Alpha');
      expect(screen.getByText('Alpha Devfile')).toBeInTheDocument();
      expect(screen.queryByText('Beta Devfile')).not.toBeInTheDocument();
      expect(screen.queryByText('Gamma Devfile')).not.toBeInTheDocument();
    });

    test('should filter devfiles by description', async () => {
      renderComponent();
      const filterInput = screen.getByLabelText('Filter devfiles');
      await userEvent.type(filterInput, 'Second');
      expect(screen.queryByText('Alpha Devfile')).not.toBeInTheDocument();
      expect(screen.getByText('Beta Devfile')).toBeInTheDocument();
    });

    test('should filter devfiles by ID', async () => {
      renderComponent();
      const filterInput = screen.getByLabelText('Filter devfiles');
      await userEvent.type(filterInput, 'devfile-3');
      expect(screen.queryByText('Alpha Devfile')).not.toBeInTheDocument();
      expect(screen.getByText('Gamma Devfile')).toBeInTheDocument();
    });

    test('should show empty results message when filter matches nothing', async () => {
      renderComponent();
      const filterInput = screen.getByLabelText('Filter devfiles');
      await userEvent.type(filterInput, 'nonexistent');
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    test('should clear filter', async () => {
      renderComponent();
      const filterInput = screen.getByLabelText('Filter devfiles');
      await userEvent.type(filterInput, 'Alpha');
      expect(screen.queryByText('Beta Devfile')).not.toBeInTheDocument();

      // Click the clear button (SearchInput provides a reset button)
      const clearButton = screen.getByRole('button', { name: /Reset/i });
      await userEvent.click(clearButton);
      expect(screen.getByText('Alpha Devfile')).toBeInTheDocument();
      expect(screen.getByText('Beta Devfile')).toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    test('should sort by name by default in ascending order', () => {
      renderComponent();
      const rows = screen.getAllByRole('row');
      // Row 0 is header. Rows 1-3 are data rows sorted by name asc.
      expect(within(rows[1]).getByText('Alpha Devfile')).toBeInTheDocument();
      expect(within(rows[2]).getByText('Beta Devfile')).toBeInTheDocument();
      expect(within(rows[3]).getByText('Gamma Devfile')).toBeInTheDocument();
    });

    test('should sort by name in descending order when clicked', async () => {
      renderComponent();
      const nameHeader = screen.getByRole('button', { name: /Name/i });
      await userEvent.click(nameHeader);
      const rows = screen.getAllByRole('row');
      expect(within(rows[1]).getByText('Gamma Devfile')).toBeInTheDocument();
      expect(within(rows[2]).getByText('Beta Devfile')).toBeInTheDocument();
      expect(within(rows[3]).getByText('Alpha Devfile')).toBeInTheDocument();
    });

    test('should sort by ID when ID column header is clicked', async () => {
      renderComponent();
      const idHeader = screen.getByRole('button', { name: /^ID$/i });
      await userEvent.click(idHeader);
      const rows = screen.getAllByRole('row');
      expect(within(rows[1]).getByText('devfile-1')).toBeInTheDocument();
      expect(within(rows[2]).getByText('devfile-2')).toBeInTheDocument();
      expect(within(rows[3]).getByText('devfile-3')).toBeInTheDocument();
    });

    test('should sort by description when Description column header is clicked', async () => {
      renderComponent();
      const descHeader = screen.getByRole('button', { name: /Description/i });
      await userEvent.click(descHeader);
      const rows = screen.getAllByRole('row');
      // Empty description sorts first in asc. Gamma has '', First, Second
      // '' < 'First' < 'Second'
      expect(within(rows[1]).getByText('Gamma Devfile')).toBeInTheDocument();
    });

    test('should toggle sort direction for the same column', async () => {
      renderComponent();
      const nameHeader = screen.getByRole('button', { name: /Name/i });

      // First click: desc (since default is asc on name)
      await userEvent.click(nameHeader);
      let rows = screen.getAllByRole('row');
      expect(within(rows[1]).getByText('Gamma Devfile')).toBeInTheDocument();

      // Second click: asc
      await userEvent.click(nameHeader);
      rows = screen.getAllByRole('row');
      expect(within(rows[1]).getByText('Alpha Devfile')).toBeInTheDocument();
    });
  });

  describe('selection', () => {
    test('should render delete button with count 0 initially', () => {
      renderComponent();
      const deleteButton = screen.getByRole('button', { name: /Delete selected devfiles/i });
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toHaveTextContent('Delete (0)');
      expect(deleteButton).toBeDisabled();
    });

    test('should select a row via checkbox', async () => {
      renderComponent();
      const checkboxes = screen.getAllByRole('checkbox');
      // First checkbox is "select all", rest are individual row checkboxes
      await userEvent.click(checkboxes[1]);
      const deleteButton = screen.getByRole('button', { name: /Delete selected devfiles/i });
      expect(deleteButton).toHaveTextContent('Delete (1)');
    });

    test('should deselect a row via checkbox', async () => {
      renderComponent();
      const checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[1]); // select
      await userEvent.click(checkboxes[1]); // deselect
      const deleteButton = screen.getByRole('button', { name: /Delete selected devfiles/i });
      expect(deleteButton).toHaveTextContent('Delete (0)');
      expect(deleteButton).toBeDisabled();
    });

    test('should select all rows via header checkbox', async () => {
      renderComponent();
      const checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[0]); // select all
      const deleteButton = screen.getByRole('button', { name: /Delete selected devfiles/i });
      expect(deleteButton).toHaveTextContent('Delete (3)');
      expect(deleteButton).toBeEnabled();
    });

    test('should deselect all rows via header checkbox', async () => {
      renderComponent();
      const checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[0]); // select all
      await userEvent.click(checkboxes[0]); // deselect all
      const deleteButton = screen.getByRole('button', { name: /Delete selected devfiles/i });
      expect(deleteButton).toHaveTextContent('Delete (0)');
    });
  });

  describe('bulk delete', () => {
    test('should open delete confirmation for single selected devfile', async () => {
      renderComponent();
      const checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[1]); // select first devfile

      const deleteButton = screen.getByRole('button', { name: /Delete selected devfiles/i });
      await userEvent.click(deleteButton);

      const confirmation = screen.getByTestId('delete-confirmation');
      expect(confirmation).toHaveAttribute('data-is-open', 'true');
      expect(screen.getByTestId('delete-confirmation-name')).toHaveTextContent('Alpha Devfile');
    });

    test('should open delete confirmation for multiple selected devfiles', async () => {
      renderComponent();
      const checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[1]); // select first
      await userEvent.click(checkboxes[2]); // select second

      const deleteButton = screen.getByRole('button', { name: /Delete selected devfiles/i });
      await userEvent.click(deleteButton);

      const confirmation = screen.getByTestId('delete-confirmation');
      expect(confirmation).toHaveAttribute('data-is-open', 'true');
      expect(screen.getByTestId('delete-confirmation-name')).toHaveTextContent('2 devfiles');
    });

    test('should call onDeleteDevfile for each selected item when confirmed', async () => {
      renderComponent();
      const checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[1]); // select first
      await userEvent.click(checkboxes[2]); // select second

      const deleteButton = screen.getByRole('button', { name: /Delete selected devfiles/i });
      await userEvent.click(deleteButton);

      // Click the mock confirm button to trigger onConfirm
      const confirmBtn = screen.getByTestId('mock-confirm-btn');
      await userEvent.click(confirmBtn);

      expect(mockOnDeleteDevfile).toHaveBeenCalledTimes(2);
      expect(mockOnDeleteDevfile).toHaveBeenCalledWith('devfile-1');
      expect(mockOnDeleteDevfile).toHaveBeenCalledWith('devfile-2');
    });

    test('should clear selection after confirming delete', async () => {
      renderComponent();
      const checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[1]);

      const deleteButton = screen.getByRole('button', { name: /Delete selected devfiles/i });
      await userEvent.click(deleteButton);

      const confirmBtn = screen.getByTestId('mock-confirm-btn');
      await userEvent.click(confirmBtn);

      expect(deleteButton).toHaveTextContent('Delete (0)');
    });

    test('should close delete confirmation without deleting when close is called', async () => {
      renderComponent();
      const checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[1]);

      const deleteButton = screen.getByRole('button', { name: /Delete selected devfiles/i });
      await userEvent.click(deleteButton);

      const closeBtn = screen.getByTestId('mock-close-btn');
      await userEvent.click(closeBtn);

      expect(mockOnDeleteDevfile).not.toHaveBeenCalled();
      const confirmation = screen.getByTestId('delete-confirmation');
      expect(confirmation).toHaveAttribute('data-is-open', 'false');
    });
  });

  describe('row click navigation', () => {
    test('should navigate to devfile details when row is clicked', async () => {
      renderComponent();
      const row = screen.getByText('Alpha Devfile').closest('tr');
      expect(row).toBeDefined();
      await userEvent.click(row!);

      expect(mockNavigate).toHaveBeenCalledWith('/devfile/test-namespace/devfile-1');
    });

    test('should not navigate when clicking on a checkbox cell', async () => {
      renderComponent();
      const checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[1]);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('delete confirmation', () => {
    test('should render delete confirmation component', () => {
      renderComponent();
      expect(screen.getByTestId('delete-confirmation')).toBeInTheDocument();
    });

    test('should be initially closed', () => {
      renderComponent();
      const confirmation = screen.getByTestId('delete-confirmation');
      expect(confirmation).toHaveAttribute('data-is-open', 'false');
    });
  });
});
