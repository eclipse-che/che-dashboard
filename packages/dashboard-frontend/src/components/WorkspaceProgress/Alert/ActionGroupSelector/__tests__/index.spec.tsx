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

import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ActionGroupSelector } from '@/components/WorkspaceProgress/Alert/ActionGroupSelector';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';
import { ActionGroup } from '@/services/helpers/types';

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

const mockOnSelect = jest.fn();

describe('ActionGroup Selector', () => {
  let actionGroup: ActionGroup;

  beforeEach(() => {
    actionGroup = {
      isGroup: true,
      title: 'Test Action Group',
      actionCallbacks: [
        {
          title: 'Action 1',
          callback: mockOnSelect.bind(null, 'action-1'),
        },
        {
          title: 'Action 2',
          callback: mockOnSelect.bind(null, 'action-2'),
        },
      ],
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot', () => {
    const snapshot = createSnapshot(actionGroup);
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('available menu items(actions)', async () => {
    actionGroup.actionCallbacks.push({
      title: 'Action 3',
      callback: () => mockOnSelect('action-3'),
    });
    actionGroup.actionCallbacks.push({
      title: 'Action 4',
      callback: () => mockOnSelect('action-4'),
    });

    renderComponent(actionGroup);

    const dropdownButton = screen.getByRole('button', { name: 'Test Action Group' });
    await userEvent.click(dropdownButton);

    // check if action callbacks are available in the dropdown
    expect(screen.queryByRole('menuitem', { name: 'Action 1' })).toBeTruthy();
    expect(screen.queryByRole('menuitem', { name: 'Action 2' })).toBeTruthy();
    expect(screen.queryByRole('menuitem', { name: 'Action 3' })).toBeTruthy();
    expect(screen.queryByRole('menuitem', { name: 'Action 4' })).toBeTruthy();
  });

  it('should select a menu item(action)', async () => {
    renderComponent(actionGroup);

    const dropdownButton = screen.getByRole('button', { name: 'Test Action Group' });
    await userEvent.click(dropdownButton);

    const menuItem = screen.queryByRole('menuitem', { name: 'Action 1' });
    expect(menuItem).toBeTruthy();

    await userEvent.click(menuItem as HTMLElement); // click on the parent element to trigger the action

    await waitFor(() => expect(mockOnSelect).toHaveBeenCalledWith('action-1'));

    expect(screen.queryAllByRole('menuitem')).toEqual([]); // dropdown should close after selection
  });
});

function getComponent(actionGroup: ActionGroup): React.ReactElement {
  return <ActionGroupSelector actionGroup={actionGroup} />;
}
