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
import { fireEvent, render, screen } from '@testing-library/react';
import { createHashHistory } from 'history';
import React from 'react';
import { Provider } from 'react-redux';
import renderer from 'react-test-renderer';
import { Store } from 'redux';

import UserMenu from '@/Layout/Header/Tools/UserMenu';
import { BRANDING_DEFAULT, BrandingData } from '@/services/bootstrap/branding.constant';
import { AppThunk } from '@/store';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';
import { selectBranding } from '@/store/Branding/selectors';
import { infrastructureNamespacesActionCreators } from '@/store/InfrastructureNamespaces';

jest.mock('@/store/InfrastructureNamespaces', () => {
  return {
    actionCreators: {
      requestNamespaces: (): AppThunk => async () => {
        return Promise.resolve();
      },
    } as typeof infrastructureNamespacesActionCreators,
  };
});

describe('User Menu', () => {
  const mockLogout = jest.fn();
  global.open = jest.fn();

  const email = 'johndoe@example.com';
  const username = 'John Doe';
  const store = createStore(username, email);
  const history = createHashHistory();
  const branding = selectBranding(store.getState());

  const component = (
    <Provider store={store}>
      <UserMenu branding={branding} history={history} username={username} logout={mockLogout} />
    </Provider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should correctly render the component', () => {
    expect(renderer.create(component).toJSON()).toMatchSnapshot();
  });

  it('should open the dropdown', () => {
    render(component);

    const menuButton = screen.getByRole('button', { name: username });
    fireEvent.click(menuButton);

    const items = screen.getAllByRole('menuitem');
    expect(items.length).toEqual(2);
  });

  it('should fire the logout event', () => {
    render(component);

    const menuButton = screen.getByRole('button', { name: username });
    fireEvent.click(menuButton);

    const logoutItem = screen.getByRole('menuitem', { name: /logout/i });
    fireEvent.click(logoutItem);

    expect(mockLogout).toHaveBeenCalled();
  });
});

function createStore(name: string, email: string): Store {
  return new MockStoreBuilder()
    .withUserProfile({
      username: name,
      email,
    } as api.IUserProfile)
    .withBranding({
      links: BRANDING_DEFAULT.links,
      docs: {},
    } as BrandingData)
    .build();
}
