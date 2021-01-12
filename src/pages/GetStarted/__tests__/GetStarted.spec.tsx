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

import { createHashHistory } from 'history';
import { Provider } from 'react-redux';
import { render, screen } from '@testing-library/react';
import { Store } from 'redux';
import createMockStore from 'redux-mock-store';
import React from 'react';
import thunk from 'redux-thunk';
import { AppState } from '../../../store';
import GetStarted from '..';

jest.mock('../GetStartedTab', () => {
  return function DummyTab(): React.ReactElement {
    return <span>Samples List Tab Content</span>;
  };
});
jest.mock('../CustomWorkspaceTab', () => {
  return function DummyTab(): React.ReactNode {
    return <span>Custom Workspace Tab Content</span>;
  };
});

describe('Get Started page', () => {

  let masthead: HTMLElement;

  beforeEach(() => {
    const store = createFakeStore();
    const history = createHashHistory();
    render(
      <Provider store={store}>
        <GetStarted history={history} />
      </Provider>
    );

    masthead = screen.getByRole('heading');
  });

  it('should have correct masthead when Get Started tab is active', () => {
    const getStartedTabButton = screen.getByRole('button', { name: 'Get Started' });
    getStartedTabButton.click();

    expect(masthead.textContent?.startsWith('Getting Started with'));
  });

  it('should have correct masthead when Custom Workspace tab is active', () => {
    const customWorkspaceTabButton = screen.getByRole('button', { name: 'Custom Workspace' });
    customWorkspaceTabButton.click();

    expect(masthead.textContent?.startsWith('Create Custom Workspace'));
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
    branding: {
      data: {
        name: 'test'
      },
    } as any,
    devfileRegistries: {} as any,
    user: {} as any,
    infrastructureNamespace: {} as any,
  };
  const middleware = [thunk];
  const mockStore = createMockStore(middleware);
  return mockStore(initialState);
}
