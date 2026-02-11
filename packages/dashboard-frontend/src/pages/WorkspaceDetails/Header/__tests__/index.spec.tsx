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

import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';
import { DevWorkspaceStatus } from '@/services/helpers/types';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';

import Header from '..';

const { renderComponent } = getComponentRenderer(getComponent);

describe('WorkspaceDetails Header', () => {
  test('renders with workspace name and status', () => {
    const store = new MockStoreBuilder().build();

    renderComponent(store, 'my-workspace', DevWorkspaceStatus.STOPPED, undefined);

    // Workspace name appears as heading and in breadcrumb
    expect(screen.getByRole('heading', { name: 'my-workspace' })).toBeInTheDocument();
    // Status label is rendered
    expect(screen.getAllByText('Stopped').length).toBeGreaterThanOrEqual(1);
  });

  test('renders with containerScc prop', () => {
    const store = new MockStoreBuilder().build();

    renderComponent(store, 'my-workspace', DevWorkspaceStatus.STOPPED, 'container-run');

    expect(screen.getByRole('heading', { name: 'my-workspace' })).toBeInTheDocument();
    expect(screen.getAllByText('Stopped').length).toBeGreaterThanOrEqual(1);
  });

  test('renders with undefined containerScc prop', () => {
    const store = new MockStoreBuilder().build();

    renderComponent(store, 'my-workspace', DevWorkspaceStatus.RUNNING, undefined);

    expect(screen.getByRole('heading', { name: 'my-workspace' })).toBeInTheDocument();
    expect(screen.getAllByText('Running').length).toBeGreaterThanOrEqual(1);
  });

  test('renders breadcrumb navigation', () => {
    const store = new MockStoreBuilder().build();

    renderComponent(store, 'my-workspace', DevWorkspaceStatus.STOPPED, undefined);

    expect(screen.getByRole('link', { name: 'Workspaces' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Workspaces' })).toHaveAttribute('href', '/workspaces');
  });

  test('renders children (action buttons)', () => {
    const store = new MockStoreBuilder().build();

    renderComponent(
      store,
      'my-workspace',
      DevWorkspaceStatus.STOPPED,
      undefined,
      <button>Test Button</button>,
    );

    expect(screen.getByRole('button', { name: 'Test Button' })).toBeInTheDocument();
  });
});

function getComponent(
  store: ReturnType<MockStoreBuilder['build']>,
  workspaceName: string,
  status: DevWorkspaceStatus,
  containerScc: string | undefined,
  children: React.ReactNode = <></>,
): React.ReactElement {
  return (
    <Provider store={store}>
      <Header
        workspacesLink="/workspaces"
        workspaceName={workspaceName}
        status={status}
        containerScc={containerScc}
      >
        {children}
      </Header>
    </Provider>
  );
}
