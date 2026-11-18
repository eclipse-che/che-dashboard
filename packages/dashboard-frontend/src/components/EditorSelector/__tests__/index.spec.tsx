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

import { api } from '@eclipse-che/common';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';

import EditorSelector from '@/components/EditorSelector';
import mockPlugins from '@/pages/GetStarted/__tests__/plugins.json';
import getComponentRenderer, { screen, within } from '@/services/__mocks__/getComponentRenderer';
import { che } from '@/services/models';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';

jest.mock('@/components/EditorSelector/Dropdown');
jest.mock('@/components/EditorSelector/CustomEditorModal');

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

  test('render editor dropdown', async () => {
    renderComponent();

    // Check that the editor gallery content (from dropdown mock) is visible
    const allEditorGalleriesContent = screen.getAllByTestId('editor-gallery-content');
    expect(allEditorGalleriesContent.length).toBeGreaterThan(0);

    // initial default editor ID
    const defaultEditor = within(allEditorGalleriesContent[0]).getByTestId('default-editor-id');
    expect(defaultEditor).toHaveTextContent('default/editor/id');
  });

  test('select editor from dropdown', async () => {
    renderComponent();

    const selectEditorButton = screen.getByTestId('select-editor-button');

    await userEvent.click(selectEditorButton);

    expect(mockOnSelect).toHaveBeenCalledWith('che-incubator/che-code/latest', undefined);
  });

  test('render custom editor modal', async () => {
    renderComponent();

    // Verify custom editor modal is rendered (mocked component)
    const customEditorModal = screen.getByTestId('custom-editor-modal-mock');
    expect(customEditorModal).toBeInTheDocument();
  });

  test('saving a custom editor selects it', async () => {
    renderComponent();

    await userEvent.click(screen.getByTestId('custom-editor-modal-save'));

    expect(mockOnSelect).toHaveBeenCalledWith(
      'schemaVersion: 2.2.2',
      'quay.io/my/editor',
      'che-code',
    );
    expect(screen.getByTestId('custom-editor-name')).toHaveTextContent('che-code');
  });
});

function getComponent() {
  const store = new MockStoreBuilder()
    .withPlugins(plugins)
    .withDwServerConfig({
      defaults: {
        editor: 'che-incubator/che-code/insiders',
      } as api.IServerConfig['defaults'],
    })
    .build();

  return (
    <Provider store={store}>
      <EditorSelector defaultEditorId="default/editor/id" onSelect={mockOnSelect} />
    </Provider>
  );
}
