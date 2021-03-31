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
import { render, screen, RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import NavigationRecentItem from '../RecentItem';
import { NavigationRecentItemObject } from '..';
import { createHashHistory } from 'history';
import { Store } from 'redux';
import { AppState } from '../../../store';
import thunk from 'redux-thunk';
import createMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { FakeStoreBuilder } from '../../../store/__mocks__/storeBuilder';

jest.mock('../../../components/Workspace/Indicator', () => {
  return function DummyWorkspaceIndicator(): React.ReactElement {
    return (<div>Dummy Workspace Indicator</div>);
  };
});

describe('Navigation Item', () => {

  let activeItem = '';
  const item: NavigationRecentItemObject = {
    status: '',
    label: 'workspace',
    to: '/namespace/workspace',
    workspaceId: 'test-wrks-id'
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  function renderComponent(): RenderResult {
    const store = createFakeStore();
    const history = createHashHistory();
    return render(
      <Provider store={store}>
        <MemoryRouter>
          <NavigationRecentItem item={item} activePath={activeItem} history={history} />
        </MemoryRouter>
      </Provider>,
    );
  }

  it('should have correct label', () => {
    renderComponent();

    const link = screen.getByTestId(item.to);
    expect(link).toHaveTextContent('workspace');
  });

  it('should have workspace status icon', () => {
    renderComponent();
    const workspaceStatusIndicator = screen.getByTestId('workspace-status-indicator');
    expect(workspaceStatusIndicator).toBeDefined();
  });

  describe('activation', () => {

    it('should render not active navigation item', () => {
      renderComponent();

      const link = screen.getByTestId(item.to);
      expect(link).not.toHaveAttribute('aria-current');
    });

    it('should render active navigation item', () => {
      activeItem = '/namespace/workspace';
      renderComponent();

      const link = screen.getByTestId(item.to);
      expect(link).toHaveAttribute('aria-current');
    });

    it('should activate navigation item on props change', () => {
      activeItem = '';
      const { rerender } = renderComponent();

      activeItem = '/namespace/workspace';
      const store = createFakeStore();
      const history = createHashHistory();
      rerender(
        <Provider store={store}>
          <MemoryRouter>
            <NavigationRecentItem item={item} activePath={activeItem} history={history} />
          </MemoryRouter>
        </Provider>,
      );

      const link = screen.getByTestId(item.to);
      expect(link).toHaveAttribute('aria-current');
    });

  });

});

function createFakeStore(): Store {
  const initialState: AppState = {
    factoryResolver: {
      isLoading: false,
      resolver: {},
    },
    plugins: {
      isLoading: false,
      plugins: [],
    },
    workspaces: {} as any,
    branding: {} as any,
    devfileRegistries: {
      isLoading: false,
      schema: {},
      metadata: [],
      devfiles: {},
      filter: ''
    },
    user: {} as any,
    userProfile: {} as any,
    infrastructureNamespace: {} as any,
    userPreferences: {} as any,
    dwPlugins: {} as any,
  };
  const middleware = [thunk];
  const mockStore = createMockStore(middleware);
  return mockStore(initialState);
}

function buildElement(item: NavigationRecentItemObject, activeItem = '', isDefaultExpanded = false): JSX.Element {
  const store = new FakeStoreBuilder().build();
  const history = createHashHistory();
  return (<Provider store={store}>
    <MemoryRouter>
      <NavigationRecentItem isDefaultExpanded={isDefaultExpanded} item={item} activePath={activeItem} history={history} />
    </MemoryRouter>
  </Provider>);
}
