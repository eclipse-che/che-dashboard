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

import { EditorSelectorModal } from '@/pages/WorkspaceDetails/OverviewTab/Editor/SelectorModal';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';
import { che } from '@/services/models';

const { renderComponent } = getComponentRenderer(getComponent);

function makePlugin(
  publisher: string,
  name: string,
  version: string,
  displayName: string,
): che.Plugin {
  return {
    id: `${publisher}/${name}/${version}`,
    name,
    publisher,
    displayName,
    type: 'Che Editor',
    version,
    icon: '<svg/>',
    iconMediatype: 'image/svg+xml',
    links: { devfile: '' },
  };
}

const editors: che.Plugin[] = [
  {
    ...makePlugin('che-incubator', 'che-code', 'latest', 'VS Code - Open Source'),
    description: 'Microsoft Visual Studio Code - Open Source IDE for Eclipse Che',
  },
  makePlugin('che-incubator', 'che-code', 'insiders', 'VS Code - Open Source'),
  makePlugin('che-incubator', 'che-idea-server', 'latest', 'JetBrains IntelliJ IDEA'),
];

const mockOnConfirm = jest.fn();
const mockOnClose = jest.fn();

function getComponent(isOpen: boolean, currentEditorId: string | undefined): React.ReactElement {
  return (
    <EditorSelectorModal
      isOpen={isOpen}
      currentEditorId={currentEditorId}
      editors={editors}
      onConfirm={mockOnConfirm}
      onClose={mockOnClose}
    />
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('EditorSelectorModal', () => {
  it('renders nothing when isOpen is false', () => {
    renderComponent(false, undefined);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a dialog when isOpen is true', () => {
    renderComponent(true, undefined);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Change Editor')).toBeInTheDocument();
  });

  it('renders one checkbox per editor group', () => {
    renderComponent(true, undefined);
    const checkboxes = screen.getAllByRole('checkbox');
    // 2 groups: che-code, che-idea-server
    expect(checkboxes).toHaveLength(2);
  });

  it('pre-selects the checkbox that matches currentEditorId', () => {
    renderComponent(true, 'che-incubator/che-idea-server/latest');
    const checkbox = screen.getByRole('checkbox', { name: /JetBrains IntelliJ IDEA/i });
    expect(checkbox).toBeChecked();
  });

  it('Save button is disabled when selection has not changed', () => {
    renderComponent(true, 'che-incubator/che-code/latest');
    expect(screen.getByRole('button', { name: /Save/i })).toBeDisabled();
  });

  it('Save button becomes enabled after selecting a different editor', async () => {
    renderComponent(true, 'che-incubator/che-code/latest');
    await userEvent.click(screen.getByRole('checkbox', { name: /JetBrains IntelliJ IDEA/i }));
    expect(screen.getByRole('button', { name: /Save/i })).not.toBeDisabled();
  });

  it('calls onConfirm with the selected editor id on Save', async () => {
    renderComponent(true, 'che-incubator/che-code/latest');
    await userEvent.click(screen.getByRole('checkbox', { name: /JetBrains IntelliJ IDEA/i }));
    await userEvent.click(screen.getByRole('button', { name: /Save/i }));
    expect(mockOnConfirm).toHaveBeenCalledWith('che-incubator/che-idea-server/latest');
  });

  it('calls onClose on Cancel', async () => {
    renderComponent(true, 'che-incubator/che-code/latest');
    await userEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows a version label for every editor group', () => {
    renderComponent(true, undefined);
    // VS Code (2 versions) shows 'latest' (active), IntelliJ (1 version) shows 'latest'
    expect(screen.getAllByText('latest')).toHaveLength(2);
  });

  it('shows version dropdown trigger for editors with multiple versions', () => {
    renderComponent(true, undefined);
    expect(
      screen.getByRole('button', { name: /VS Code - Open Source version options/i }),
    ).toBeInTheDocument();
  });

  it('does NOT show version dropdown for editors with a single version', () => {
    renderComponent(true, undefined);
    expect(
      screen.queryByRole('button', { name: /JetBrains IntelliJ IDEA version options/i }),
    ).not.toBeInTheDocument();
  });

  it('updates selected version when a version is chosen from the dropdown', async () => {
    renderComponent(true, 'che-incubator/che-code/latest');
    await userEvent.click(
      screen.getByRole('button', { name: /VS Code - Open Source version options/i }),
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'insiders' }));
    expect(screen.getByText('insiders')).toBeInTheDocument();
  });

  it('calls onConfirm with the correct version when a non-default version is selected then confirmed', async () => {
    renderComponent(true, 'che-incubator/che-code/latest');
    await userEvent.click(
      screen.getByRole('button', { name: /VS Code - Open Source version options/i }),
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'insiders' }));
    await userEvent.click(screen.getByRole('button', { name: /Save/i }));
    expect(mockOnConfirm).toHaveBeenCalledWith('che-incubator/che-code/insiders');
  });

  it('filters editors by display name', async () => {
    renderComponent(true, undefined);
    const filter = screen.getByRole('searchbox', { name: /Filter editors by name/i });
    await userEvent.type(filter, 'JetBrains');
    expect(screen.queryByRole('checkbox', { name: /VS Code/i })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /JetBrains IntelliJ IDEA/i })).toBeInTheDocument();
  });

  it('filters editors by version string', async () => {
    renderComponent(true, undefined);
    const filter = screen.getByRole('searchbox', { name: /Filter editors by name/i });
    await userEvent.type(filter, 'insiders');
    expect(screen.getByRole('checkbox', { name: /VS Code/i })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /JetBrains/i })).not.toBeInTheDocument();
  });

  it('filters editors by description text', async () => {
    renderComponent(true, undefined);
    const filter = screen.getByRole('searchbox', { name: /Filter editors by name/i });
    await userEvent.type(filter, 'Open Source IDE');
    expect(screen.getByRole('checkbox', { name: /VS Code/i })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /JetBrains/i })).not.toBeInTheDocument();
  });

  it('shows "No editors match the filter" when filter yields no results', async () => {
    renderComponent(true, undefined);
    const filter = screen.getByRole('searchbox', { name: /Filter editors by name/i });
    await userEvent.type(filter, 'NonExistentEditor');
    expect(screen.getByText('No editors match the filter.')).toBeInTheDocument();
  });

  it('shows a custom label when currentEditorId does not match any known editor', () => {
    renderComponent(true, 'custom-publisher/my-editor/dev');
    expect(screen.getByText('custom-publisher/my-editor/dev')).toBeInTheDocument();
    expect(screen.getByText('custom')).toBeInTheDocument();
  });
});
