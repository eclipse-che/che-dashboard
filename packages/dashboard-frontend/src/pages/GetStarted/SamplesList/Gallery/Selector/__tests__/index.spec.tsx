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

import userEvent, { UserEvent } from '@testing-library/user-event';
import React from 'react';

import { Selector } from '@/pages/GetStarted/SamplesList/Gallery/Selector';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

const mockOnChange = jest.fn();

describe('Selector', () => {
  let list: string[];
  let user: UserEvent;

  beforeEach(() => {
    list = ['tag1', 'tag2', 'tag3'];
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockOnChange.mockReset();
  });

  describe('kebab toggle', () => {
    test('snapshot', () => {
      const snapshot = createSnapshot(list, 'Bulk Selector');
      expect(snapshot.toJSON()).toMatchSnapshot();
    });

    test('open dropdown', async () => {
      renderComponent(list);
      const toggle = screen.queryByRole('button');

      expect(toggle).toBeTruthy();

      // dropdown menu is not visible
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      list.forEach(tag => {
        expect(screen.queryByText(tag)).toBeFalsy();
      });

      // toggle dropdown
      await user.click(toggle!);

      // now the dropdown menu is visible
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      list.forEach(tag => {
        expect(screen.queryByText(tag)).toBeTruthy();
      });
    });
  });

  test('handling selection', async () => {
    renderComponent(list);
    // toggle dropdown
    await user.click(screen.queryByRole('button')!);
    // select the first item
    await user.click(screen.queryByText(list[0])!);
    // expect selected item to be in the selected state
    expect(mockOnChange).toHaveBeenCalledWith([list[0]]);
    // select the second item
    await user.click(screen.queryByText(list[1])!);
    // expect selected item to be in the selected state
    expect(mockOnChange).toHaveBeenCalledWith([list[0], list[1]]);
    // deselect the first item
    await user.click(screen.queryByText(list[0])!);
    // expect selected item to be in the selected state
    expect(mockOnChange).toHaveBeenCalledWith([list[1]]);
  });
});

function getComponent(
  list: string[],
  placeholderText: string = '-- Select --',
): React.ReactElement {
  const component = (
    <Selector list={list} placeholderText={placeholderText} onChange={mockOnChange} />
  );

  return component;
}
