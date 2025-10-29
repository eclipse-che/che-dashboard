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

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';
import { Store } from 'redux';

import WorkspaceNameFormGroup from '@/pages/GetStarted/SamplesList/Toolbar/WorkspaceName';
import getComponentRenderer from '@/services/__mocks__/getComponentRenderer';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';

const { renderComponent, createSnapshot } = getComponentRenderer(getComponent);

const mockOnChange = jest.fn();

// mute console.error
console.error = jest.fn();

describe('Workspace Name', () => {
  let store: Store;

  beforeEach(() => {
    const workspaces = [0, 1, 2, 3, 4].map(i =>
      new DevWorkspaceBuilder()
        .withId('wksp-' + i)
        .withName('wksp-' + i)
        .build(),
    );
    store = new MockStoreBuilder().withDevWorkspaces({ workspaces }).build();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot', () => {
    const snapshot = createSnapshot(store);
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  describe('valid value', () => {
    test('default empty value', () => {
      renderComponent(store);

      const input = screen.getByRole('textbox');

      expect(input).toHaveValue('');
    });

    test('change to valid value', async () => {
      renderComponent(store);

      const input = screen.getByRole('textbox');

      const workspaceName = 'new-workspace';
      await userEvent.click(input);
      await userEvent.paste(workspaceName);

      expect(mockOnChange).toHaveBeenNthCalledWith(1, workspaceName);
    });

    test('clean up value', async () => {
      renderComponent(store);

      const input = screen.getByRole('textbox');

      const workspaceName = 'new-workspace';
      await userEvent.click(input);
      await userEvent.paste(workspaceName);
      expect(mockOnChange).toHaveBeenNthCalledWith(1, workspaceName);

      await userEvent.clear(input);
      expect(mockOnChange).toHaveBeenNthCalledWith(2, '');
    });
  });
  describe('invalid value', () => {
    test('used workspace name value', async () => {
      const workspaceName = 'new-workspace';
      const callbacks: { reset?: () => void } = {};

      renderComponent(store, callbacks);

      const input = screen.getByRole('textbox');

      await userEvent.click(input);
      await userEvent.paste(workspaceName);

      expect(mockOnChange).toHaveBeenNthCalledWith(1, workspaceName);
      mockOnChange.mockReset();

      callbacks.reset?.();

      expect(mockOnChange).toHaveBeenNthCalledWith(1, '');
      mockOnChange.mockReset();

      await userEvent.click(input);
      await userEvent.paste(workspaceName);

      expect(mockOnChange).toHaveBeenNthCalledWith(1, '');
      mockOnChange.mockReset();

      await userEvent.paste('-new');

      expect(mockOnChange).toHaveBeenNthCalledWith(1, `${workspaceName}-new`);
    });
    test('change to too long value', async () => {
      renderComponent(store);

      const input = screen.getByRole('textbox');

      const workspaceName = 'a'.repeat(64);
      await userEvent.click(input);
      await userEvent.paste(workspaceName);

      expect(mockOnChange).toHaveBeenNthCalledWith(1, '');
    });
    test('change to invalid pattern value', async () => {
      renderComponent(store);

      const input = screen.getByRole('textbox');

      const workspaceName = 'invalid name!';
      await userEvent.click(input);
      await userEvent.paste(workspaceName);

      expect(mockOnChange).toHaveBeenNthCalledWith(1, '');
    });
    test('change to existing name value', async () => {
      renderComponent(store);

      const input = screen.getByRole('textbox');

      const workspaceName = 'wksp-1';
      await userEvent.click(input);
      await userEvent.paste(workspaceName);

      expect(mockOnChange).toHaveBeenNthCalledWith(1, '');
    });
  });
});

function getComponent(store: Store, callbacks?: { reset?: () => void }) {
  return (
    <Provider store={store}>
      <WorkspaceNameFormGroup
        onChange={workspaceName => mockOnChange(workspaceName)}
        callbacks={callbacks}
      ></WorkspaceNameFormGroup>
    </Provider>
  );
}
