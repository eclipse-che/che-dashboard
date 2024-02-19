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

import { createMemoryHistory } from 'history';
import React from 'react';
import { Provider } from 'react-redux';
import { Store } from 'redux';

import GetStarted from '@/pages/GetStarted';
import getComponentRenderer from '@/services/__mocks__/getComponentRenderer';
import { FakeStoreBuilder } from '@/store/__mocks__/storeBuilder';

jest.mock('@/components/EditorSelector');
jest.mock('@/pages/GetStarted/SamplesList');
jest.mock('@/pages/GetStarted/ImportFromGit');

const { createSnapshot } = getComponentRenderer(getComponent);

describe('GetStarted', () => {
  test('snapshot', () => {
    const store = new FakeStoreBuilder().build();
    const snapshot = createSnapshot(store);
    expect(snapshot.toJSON()).toMatchSnapshot();
  });
});

function getComponent(store: Store) {
  const history = createMemoryHistory();
  return (
    <Provider store={store}>
      <GetStarted history={history} />
    </Provider>
  );
}
