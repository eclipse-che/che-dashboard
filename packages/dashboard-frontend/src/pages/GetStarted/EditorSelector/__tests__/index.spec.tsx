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

import { api } from '@eclipse-che/common';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';

import mockPlugins from '@/pages/GetStarted/__tests__/plugins.json';
import EditorSelector from '@/pages/GetStarted/EditorSelector';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';
import { che } from '@/services/models';
import { FakeStoreBuilder } from '@/store/__mocks__/storeBuilder';

jest.mock('@/pages/GetStarted/EditorSelector/Entry');

const plugins = mockPlugins as che.Plugin[];

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

const mockOnSelect = jest.fn();

describe('Editor Selector', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot', () => {
    const snapshot = createSnapshot();
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('editor entry click', () => {
    renderComponent();

    expect(mockOnSelect).not.toHaveBeenCalled();

    const button = screen.getByRole('button', { name: 'Select che-idea next' });
    userEvent.click(button);

    expect(mockOnSelect).toHaveBeenCalledWith('che-incubator/che-idea/next');
  });
});

function getComponent() {
  const store = new FakeStoreBuilder()
    .withPlugins(plugins)
    .withDwServerConfig({
      defaults: {
        editor: 'che-incubator/che-code/insiders',
      } as api.IServerConfig['defaults'],
    })
    .build();
  return (
    <Provider store={store}>
      <EditorSelector selectedEditorId="some/editor/id" onSelect={mockOnSelect} />
    </Provider>
  );
}
