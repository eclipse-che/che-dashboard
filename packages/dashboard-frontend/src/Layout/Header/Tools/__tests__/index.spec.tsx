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
import { createHashHistory } from 'history';
import React from 'react';
import { Provider } from 'react-redux';
import renderer from 'react-test-renderer';
import { Store } from 'redux';

import HeaderTools from '@/Layout/Header/Tools';
import { BRANDING_DEFAULT, BrandingData } from '@/services/bootstrap/branding.constant';
import { AppThunk } from '@/store';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';
import { infrastructureNamespacesActionCreators } from '@/store/InfrastructureNamespaces';

jest.mock('gravatar-url', () => {
  return function () {
    return 'avatar/source/location';
  };
});

jest.mock('@/store/InfrastructureNamespaces', () => {
  return {
    actionCreators: {
      requestNamespaces: (): AppThunk => async (): Promise<void> => {
        return Promise.resolve();
      },
    } as typeof infrastructureNamespacesActionCreators,
  };
});

describe('Page header tools', () => {
  const mockLogout = jest.fn();

  const productCli = 'crwctl';
  const email = 'johndoe@example.com';
  const name = 'John Doe';
  const store = createStore(productCli, name, email);
  const history = createHashHistory();

  const component = (
    <Provider store={store}>
      <HeaderTools history={history} logout={mockLogout} />
    </Provider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should correctly render the component', () => {
    expect(renderer.create(component).toJSON()).toMatchSnapshot();
  });
});

function createStore(cheCliTool: string, name: string, email: string): Store {
  return new MockStoreBuilder()
    .withUserProfile({
      username: name,
      email,
    } as api.IUserProfile)
    .withBranding({
      configuration: {
        cheCliTool,
      },
      links: BRANDING_DEFAULT.links,
      docs: {},
    } as BrandingData)
    .build();
}
