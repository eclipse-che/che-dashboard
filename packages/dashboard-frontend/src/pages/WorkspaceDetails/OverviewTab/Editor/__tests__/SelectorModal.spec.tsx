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
  makePlugin('che-incubator', 'che-code', 'latest', 'VS Code - Open Source'),
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

  it('renders one radio per editor group', () => {
    renderComponent(true, undefined);
    const radios = screen.getAllByRole('radio');
    // 2 groups: che-code, che-idea-server
    expect(radios).toHaveLength(2);
  });

  it('pre-selects the radio that matches currentEditorId', () => {
    renderComponent(true, 'che-incubator/che-idea-server/latest');
    const radio = screen.getByRole('radio', { name: /JetBrains IntelliJ IDEA/i });
    expect(radio).toBeChecked();
  });

  it('Save button is disabled when selection has not changed', () => {
    renderComponent(true, 'che-incubator/che-code/latest');
    expect(screen.getByRole('button', { name: /Save/i })).toBeDisabled();
  });

  it('Save button becomes enabled after selecting a different editor', async () => {
    renderComponent(true, 'che-incubator/che-code/latest');
    await userEvent.click(screen.getByRole('radio', { name: /JetBrains IntelliJ IDEA/i }));
    expect(screen.getByRole('button', { name: /Save/i })).not.toBeDisabled();
  });

  it('calls onConfirm with the selected editor id on Save', async () => {
    renderComponent(true, 'che-incubator/che-code/latest');
    await userEvent.click(screen.getByRole('radio', { name: /JetBrains IntelliJ IDEA/i }));
    await userEvent.click(screen.getByRole('button', { name: /Save/i }));
    expect(mockOnConfirm).toHaveBeenCalledWith('che-incubator/che-idea-server/latest');
  });

  it('calls onClose on Cancel', async () => {
    renderComponent(true, 'che-incubator/che-code/latest');
    await userEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows a version label for each editor group', () => {
    renderComponent(true, undefined);
    // VS Code - Open Source has versions: latest, insiders
    expect(screen.getByText('latest')).toBeInTheDocument();
  });

  it('shows version dropdown trigger for editors with multiple versions', () => {
    renderComponent(true, undefined);
    // VS Code has 2 versions → kebab button present
    expect(
      screen.getByRole('button', { name: /VS Code - Open Source version options/i }),
    ).toBeInTheDocument();
  });

  it('does NOT show version dropdown for editors with a single version', () => {
    renderComponent(true, undefined);
    // IntelliJ has 1 version → no kebab
    expect(
      screen.queryByRole('button', { name: /JetBrains IntelliJ IDEA version options/i }),
    ).not.toBeInTheDocument();
  });

  it('updates selected version when a version is chosen from the dropdown', async () => {
    renderComponent(true, 'che-incubator/che-code/latest');
    // open version dropdown
    await userEvent.click(
      screen.getByRole('button', { name: /VS Code - Open Source version options/i }),
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'insiders' }));
    // now version label shows insiders
    expect(screen.getByText('insiders')).toBeInTheDocument();
  });

  it('calls onConfirm with the correct version when a non-default version is selected then confirmed', async () => {
    renderComponent(true, 'che-incubator/che-code/latest');
    // switch to insiders version
    await userEvent.click(
      screen.getByRole('button', { name: /VS Code - Open Source version options/i }),
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'insiders' }));
    await userEvent.click(screen.getByRole('button', { name: /Save/i }));
    expect(mockOnConfirm).toHaveBeenCalledWith('che-incubator/che-code/insiders');
  });
});
