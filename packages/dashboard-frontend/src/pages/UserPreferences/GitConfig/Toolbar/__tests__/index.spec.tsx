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

import { GitConfigToolbar } from '@/pages/UserPreferences/GitConfig/Toolbar';
import getComponentRenderer, { screen, waitFor } from '@/services/__mocks__/getComponentRenderer';

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

const mockOnAdd = jest.fn();
const mockOnChangeMode = jest.fn();

describe('GitConfigToolbar', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot, form mode', () => {
    const snapshot = createSnapshot('form');
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('snapshot, viewer mode', () => {
    const snapshot = createSnapshot('form');
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('import Git Configuration', () => {
    renderComponent('form');

    expect(mockOnAdd).not.toHaveBeenCalled();

    const button = screen.getByRole('button', { name: 'Import Git Configuration' });
    button.click();

    expect(mockOnAdd).toHaveBeenCalled();
  });

  test('change mode to viewer', async () => {
    renderComponent('form');

    expect(mockOnChangeMode).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Switch to Form' })).toBeNull();

    const viewerButton = screen.getByRole('button', { name: 'Switch to Viewer' });
    await userEvent.click(viewerButton);

    await waitFor(() => expect(mockOnChangeMode).toHaveBeenCalledWith('viewer'));
  });

  test('change mode to form', async () => {
    renderComponent('viewer');

    expect(mockOnChangeMode).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Switch to Viewer' })).toBeNull();

    const formButton = screen.getByRole('button', { name: 'Switch to Form' });
    await userEvent.click(formButton);

    await waitFor(() => expect(mockOnChangeMode).toHaveBeenCalledWith('form'));
  });
});

function getComponent(mode: 'form' | 'viewer'): React.ReactElement {
  return <GitConfigToolbar mode={mode} onAdd={mockOnAdd} onChangeMode={mockOnChangeMode} />;
}
