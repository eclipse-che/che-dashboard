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
  DeleteConfirmation: function MockDeleteConfirmation() {
    return <div data-testid="delete-confirmation" />;
  },
}));

const mockDevfiles: LocalDevfile[] = [
  {
    id: 'devfile-1',
    name: 'My First Devfile',
    description: 'First test devfile',
    content: 'schemaVersion: 2.2.0\nmetadata:\n  name: my-first-devfile\n',
    projectNames: ['project-a'],
    lastModified: '2026-01-01T00:00:00Z',
  },
  {
    id: 'devfile-2',
    name: 'My Second Devfile',
    description: 'Second test devfile',
    content: 'schemaVersion: 2.2.0\nmetadata:\n  name: my-second-devfile\n',
    projectNames: ['project-b', 'project-c'],
    lastModified: '2026-01-02T00:00:00Z',
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

  test('should render the page title', () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: 'Devfiles', level: 1 })).toBeDefined();
  });

  test('should render Add Devfile button', () => {
    renderComponent();
    const buttons = screen.getAllByRole('button', { name: /Add Devfile/i });
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('should render devfile entries in the table', () => {
    renderComponent();
    expect(screen.getByText('My First Devfile')).toBeDefined();
    expect(screen.getByText('My Second Devfile')).toBeDefined();
  });

  test('should render devfile IDs', () => {
    renderComponent();
    expect(screen.getByText('devfile-1')).toBeDefined();
    expect(screen.getByText('devfile-2')).toBeDefined();
  });

  test('should render devfile descriptions', () => {
    renderComponent();
    expect(screen.getByText('First test devfile')).toBeDefined();
    expect(screen.getByText('Second test devfile')).toBeDefined();
  });

  test('should render project names', () => {
    renderComponent();
    expect(screen.getByText('project-a')).toBeDefined();
    expect(screen.getByText('project-b, project-c')).toBeDefined();
  });

  test('should show ProgressIndicator when loading', () => {
    renderComponent({ isLoading: true });
    expect(screen.getByTestId('progress-indicator')).toBeDefined();
  });

  test('should not show ProgressIndicator when not loading', () => {
    renderComponent({ isLoading: false });
    expect(screen.queryByTestId('progress-indicator')).toBeNull();
  });

  test('should show empty state when no devfiles', () => {
    renderComponent({ devfiles: [] });
    expect(screen.getByText('No Devfiles')).toBeDefined();
  });

  test('should open Add Devfile modal when button is clicked', async () => {
    renderComponent();
    const addButton = screen.getAllByRole('button', { name: /Add Devfile/i })[0];
    await userEvent.click(addButton);
    expect(screen.getByPlaceholderText('my-devfile')).toBeDefined();
    expect(screen.getByPlaceholderText('Optional description for this devfile')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Create' })).toBeDefined();
  });

  test('should render the Devfiles List Table', () => {
    renderComponent();
    expect(screen.getByLabelText('Devfiles List Table')).toBeDefined();
  });

  test('should render table column headers', () => {
    renderComponent();
    expect(screen.getByText('ID')).toBeDefined();
    expect(screen.getByText('Name')).toBeDefined();
    expect(screen.getByText('Description')).toBeDefined();
    expect(screen.getByText('Projects')).toBeDefined();
  });
});
