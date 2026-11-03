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

import { render, screen } from '@testing-library/react';
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
  const name = 'John Doe';
  const store = createStore(productCli, name);
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

  describe('Agent Space button', () => {
    it('should not be rendered by default', () => {
      render(component);

      expect(screen.queryByRole('link', { name: 'Agent Space' })).not.toBeInTheDocument();
    });

    it('should not be rendered when agentSandbox is disabled', () => {
      render(buildComponent(createStore(productCli, name, false)));

      expect(screen.queryByRole('link', { name: 'Agent Space' })).not.toBeInTheDocument();
    });

    it('should link to the Agent Space bundle when agentSandbox is enabled', () => {
      render(buildComponent(createStore(productCli, name, true)));

      const button = screen.getByRole('link', { name: 'Agent Space' });

      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('href', '/agent-space/');
    });
  });
});

function buildComponent(store: Store): React.ReactElement {
  return (
    <Provider store={store}>
      <HeaderTools history={createHashHistory()} logout={jest.fn()} />
    </Provider>
  );
}

function createStore(cheCliTool: string, name: string, agentSandboxEnabled?: boolean): Store {
  const builder = new MockStoreBuilder().withUsername(name).withBranding({
    configuration: {
      cheCliTool,
    },
    links: BRANDING_DEFAULT.links,
    docs: {},
  } as BrandingData);

  if (agentSandboxEnabled !== undefined) {
    builder.withDwServerConfig({ agentSandbox: { enabled: agentSandboxEnabled } });
  }

  return builder.build();
}
