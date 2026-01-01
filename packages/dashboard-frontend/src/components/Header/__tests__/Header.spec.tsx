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

import React from 'react';
import { Provider } from 'react-redux';
import renderer from 'react-test-renderer';

import { WorkspaceStatus } from '@/services/helpers/types';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';

import Header from '..';

describe('The header component for IDE-loader and Factory-loader pages', () => {
  it('should render start workspace correctly', () => {
    const store = new MockStoreBuilder().build();
    const element = (
      <Provider store={store}>
        <Header
          title="Start workspace"
          status={WorkspaceStatus.STARTING}
          containerScc={undefined}
        />
      </Provider>
    );

    expect(renderer.create(element).toJSON()).toMatchSnapshot();
  });

  it('should render workspace error correctly', () => {
    const store = new MockStoreBuilder().build();
    const element = (
      <Provider store={store}>
        <Header title="Workspace error" status={WorkspaceStatus.ERROR} containerScc={undefined} />
      </Provider>
    );

    expect(renderer.create(element).toJSON()).toMatchSnapshot();
  });
});
