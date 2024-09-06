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

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InitialEntry } from 'history';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Store } from 'redux';

import { ROUTE } from '@/Routes';
import getComponentRenderer from '@/services/__mocks__/getComponentRenderer';
import { constructWorkspace } from '@/services/workspace-adapter';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';
import { FakeStoreBuilder } from '@/store/__mocks__/storeBuilder';

import LoaderContainer from '..';

jest.mock('@/pages/Loader');

const mockFindTargetWorkspace = jest.fn().mockReturnValue(undefined);
jest.mock('@/services/helpers/factoryFlow/findTargetWorkspace', () => ({
  __esModule: true,
  findTargetWorkspace: () => mockFindTargetWorkspace(),
}));

const { renderComponent } = getComponentRenderer(getComponent);

describe('Loader container', () => {
  const factoryUrl = 'factory-url';
  const namespace = 'user-che';
  const workspaceName = 'my-wksp';
  let emptyStore: Store;

  beforeEach(() => {
    emptyStore = new FakeStoreBuilder().build();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('render the loader page in factory mode', () => {
    const entry = `/load-factory?url=${factoryUrl}`;

    renderComponent(emptyStore, [entry]);

    expect(screen.getByTestId('loader-page')).toBeInTheDocument();
  });

  test('render the loader page in workspace mode', () => {
    const entry = `/ide/${namespace}/${workspaceName}`;

    renderComponent(emptyStore, [entry]);

    expect(screen.getByTestId('loader-page')).toBeInTheDocument();
  });

  it('should handle tab change', async () => {
    const entry = `/ide/${namespace}/${workspaceName}`;

    renderComponent(emptyStore, [entry]);

    const tab = screen.getByTestId('tab-button');
    await userEvent.click(tab);

    await waitFor(() => {
      expect(screen.getByTestId('loader-tab')).toHaveTextContent('Events');
    });
  });

  // todo - fix this test
  xit('should re-render the loader page when the location changes', async () => {
    const entry = `/load-factory?url=${factoryUrl}`;

    const { reRenderComponent } = renderComponent(emptyStore, [entry]);

    expect(screen.getByTestId('workspace')).toHaveTextContent('unknown');

    const namespace = 'user-che';
    const workspaceName = 'my-wksp';
    const nextDevWorkspace = new DevWorkspaceBuilder()
      .withNamespace(namespace)
      .withName(workspaceName)
      .build();
    const nextStore = new FakeStoreBuilder()
      .withDevWorkspaces({ workspaces: [nextDevWorkspace] })
      .build();

    const newEntry = `/ide/${namespace}/${workspaceName}`;

    mockFindTargetWorkspace.mockClear();
    mockFindTargetWorkspace.mockReturnValueOnce(constructWorkspace(nextDevWorkspace));

    reRenderComponent(nextStore, [newEntry]);

    expect(screen.getByTestId('workspace')).toHaveTextContent(workspaceName);
  });
});

function getComponent(store: Store, initialEntries: InitialEntry[]): React.ReactElement {
  return (
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path={ROUTE.FACTORY_LOADER} element={<LoaderContainer />} />
          <Route path={ROUTE.IDE_LOADER} element={<LoaderContainer />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}
