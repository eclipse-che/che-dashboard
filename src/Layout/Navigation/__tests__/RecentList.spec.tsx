/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import React from 'react';
import createMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { MemoryRouter } from 'react-router';
import { Nav } from '@patternfly/react-core';
import { Provider } from 'react-redux';
import { RenderResult, render, screen } from '@testing-library/react';
import { Store } from 'redux';

import NavigationRecentList from '../RecentList';
import { AppState } from '../../../store';

describe('Navigation Recent List', () => {

  const workspaces: che.Workspace[] = [
    {
      id: 'wksp-1',
      devfile: {
        metadata: {
          name: 'wksp-1'
        }
      },
      attributes: {
        updated: 1,
      } as any,
    } as che.Workspace,
    {
      id: 'wksp-2',
      devfile: {
        metadata: {
          name: 'wksp-2'
        }
      },
      attributes: {
        updated: 2,
      } as any,
    } as che.Workspace,
    {
      id: 'wksp-3',
      devfile: {
        metadata: {
          name: 'wksp-3'
        }
      },
      attributes: {
        updated: 3,
      } as any,
    } as che.Workspace,
  ];

  function renderComponent(store: Store, workspaces: che.Workspace[]): RenderResult {
    return render(
      <Provider store={store}>
        <MemoryRouter>
          <Nav
            onSelect={() => jest.fn()}
            theme="light"
          >
            <NavigationRecentList workspaces={workspaces} activePath="" />
          </Nav>
        </MemoryRouter>
      </Provider>
    );
  }

  it('should have correct number of main navigation items', () => {
    const store = createFakeStore(workspaces);
    renderComponent(store, workspaces);

    const navLinks = screen.getAllByRole('link');
    expect(navLinks.length).toEqual(workspaces.length + 1);
  });

  it('should have correct navigation item labels', () => {
    const store = createFakeStore(workspaces);
    renderComponent(store, workspaces);

    const navLinks = screen.getAllByRole('link');

    expect(navLinks[0]).toHaveTextContent('Create Workspace');
    expect(navLinks[1]).toHaveTextContent('wksp-1');
    expect(navLinks[2]).toHaveTextContent('wksp-2');
    expect(navLinks[3]).toHaveTextContent('wksp-3');
  });

  it('should correctly handle workspaces order', () => {
    const store = createFakeStore(workspaces);
    const { rerender } = renderComponent(store, workspaces);

    // change workspaces order
    [workspaces[0], workspaces[2]] = [workspaces[2], workspaces[0]];
    rerender(
      <Provider store={store}>
        <MemoryRouter>
          <Nav
            onSelect={() => jest.fn()}
            theme="light"
          >
            <NavigationRecentList workspaces={workspaces} activePath="" />
          </Nav>
        </MemoryRouter>
      </Provider>
    );

    const navLinks = screen.getAllByRole('link');

    expect(navLinks[0]).toHaveTextContent('Create Workspace');
    expect(navLinks[1]).toHaveTextContent('wksp-3');
    expect(navLinks[2]).toHaveTextContent('wksp-2');
    expect(navLinks[3]).toHaveTextContent('wksp-1');
  });

});

function createFakeStore(workspaces: che.Workspace[]): Store {
  const initialState: AppState = {
    factoryResolver: {
      isLoading: false,
      resolver: {},
    },
    plugins: {
      isLoading: false,
      plugins: [],
    },
    workspaces: {
      isLoading: false,
      settings: {} as any,
      workspaces,
      workspacesLogs: new Map<string, string[]>(),

      namespace: '',
      workspaceName: '',
      workspaceId: '',
      recentNumber: 5,
    },
    branding: {} as any,
    devfileRegistries: {} as any,
    user: {} as any,
    infrastructureNamespace: {} as any,
  };
  const middleware = [thunk];
  const mockStore = createMockStore(middleware);
  return mockStore(initialState);
}
