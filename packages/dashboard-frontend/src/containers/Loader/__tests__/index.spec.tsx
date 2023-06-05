/*
 * Copyright (c) 2018-2023 Red Hat, Inc.
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
import React from 'react';
import { Provider } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import LoaderContainer from '..';
import { ROUTE } from '../../../Routes/routes';
import getComponentRenderer from '../../../services/__mocks__/getComponentRenderer';
import { getMockRouterProps } from '../../../services/__mocks__/router';
import { FakeStoreBuilder } from '../../../store/__mocks__/storeBuilder';

jest.mock('../../../pages/Loader');

jest.mock('../../../services/helpers/factoryFlow/findTargetWorkspace', () => ({
  __esModule: true,
  findTargetWorkspace: jest.fn().mockReturnValue({}),
}));

const { renderComponent } = getComponentRenderer(getComponent);

describe('Loader container', () => {
  const factoryUrl = 'factory-url';
  const namespace = 'user-che';
  const workspaceName = 'my-wksp';

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('render the loader page in factory mode', () => {
    const props = getMockRouterProps(ROUTE.FACTORY_LOADER_URL, { url: factoryUrl });

    renderComponent(props);

    expect(screen.getByTestId('loader-page')).toBeInTheDocument();
  });

  test('render the loader page in workspace mode', () => {
    const props = getMockRouterProps(ROUTE.IDE_LOADER, {
      namespace,
      workspaceName,
    });

    renderComponent(props);

    expect(screen.getByTestId('loader-page')).toBeInTheDocument();
  });

  it('should handle tab change', async () => {
    const props = getMockRouterProps(ROUTE.IDE_LOADER, {
      namespace,
      workspaceName,
    });

    renderComponent(props);

    const tab = screen.getByTestId('tab-button');
    userEvent.click(tab);

    await waitFor(() => {
      expect(screen.getByTestId('loader-tab')).toHaveTextContent('Events');
    });
  });
});

function getComponent(props: RouteComponentProps): React.ReactElement {
  const store = new FakeStoreBuilder().build();
  return (
    <Provider store={store}>
      <LoaderContainer {...props} />
    </Provider>
  );
}
