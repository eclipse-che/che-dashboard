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

import { render, screen, waitFor } from '@testing-library/react';
import { Location } from 'history';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { ROUTE } from '@/Routes';
import NavigateHome from '@/Routes/NavigateHome';
import devfileApi from '@/services/devfileApi';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';

describe('NavigateHome', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Workspace route', () => {
    it('should handle "/" with an empty workspace list correctly', async () => {
      const path = ROUTE.HOME;
      const workspaces: devfileApi.DevWorkspace[] = [];
      render(getComponent(path, workspaces));

      await waitFor(() => expect(screen.queryByText('Create Workspace')).toBeTruthy());

      expect(screen.queryByTestId('fallback-spinner')).not.toBeInTheDocument();
    });
  });

  describe('Workspaces List route', () => {
    it('should handle "/" with a workspace list correctly', async () => {
      const path = ROUTE.HOME;
      const workspaces: devfileApi.DevWorkspace[] = [];
      // Simulate adding workspaces to the list
      for (let i = 0; i < 5; i++) {
        workspaces.push(new DevWorkspaceBuilder().build());
      }

      render(getComponent(path, workspaces));

      await waitFor(() => expect(screen.queryByText('Workspaces List')).toBeTruthy());

      expect(screen.queryByTestId('fallback-spinner')).not.toBeInTheDocument();
    });
  });
});

function getComponent(
  locationOrPath: Location | string,
  workspaces: devfileApi.DevWorkspace[],
): React.ReactElement {
  const store = new MockStoreBuilder()
    .withDevWorkspaces({
      workspaces,
    })
    .build();
  return (
    <Provider store={store}>
      <MemoryRouter initialEntries={[locationOrPath]}>
        <Routes>
          {/* test result of Redirects */}
          <Route path={ROUTE.GET_STARTED} element={<span>Create Workspace</span>} />
          <Route path={ROUTE.WORKSPACES} element={<span>Workspaces List</span>} />
          {/* <Redirects /> */}
          <Route path="*" element={<NavigateHome />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}
