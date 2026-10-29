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

import { render as renderComponent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';

import { App } from '@/App';
import { createSandboxClient } from '@/services/client';
import { DEFAULT_CONFIG, loadConfig } from '@/services/config';
import { resolveNamespace } from '@/services/namespace';
import { createUnloadedStore, TEST_NAMESPACE, testClient, testConfig } from '@/testUtils';

jest.mock('@/services/config', () => ({
  ...jest.requireActual('@/services/config'),
  loadConfig: jest.fn(),
}));
jest.mock('@/services/client', () => ({ createSandboxClient: jest.fn() }));
jest.mock('@/services/namespace', () => ({ resolveNamespace: jest.fn() }));
jest.mock('@/Routes', () => ({
  ...jest.requireActual('@/Routes'),
  AppRoutes: () => <div data-testid="app-routes" />,
}));

const loadConfigMock = loadConfig as jest.MockedFunction<typeof loadConfig>;
const createClientMock = createSandboxClient as jest.MockedFunction<typeof createSandboxClient>;
const resolveNamespaceMock = resolveNamespace as jest.MockedFunction<typeof resolveNamespace>;

/** The App is the component that bootstraps, so it starts from an empty store. */
function render(): void {
  renderComponent(
    <Provider store={createUnloadedStore()}>
      <App />
    </Provider>,
  );
}

function bootstrapSucceeds(): void {
  loadConfigMock.mockResolvedValue(testConfig());
  createClientMock.mockResolvedValue(testClient());
  resolveNamespaceMock.mockResolvedValue(TEST_NAMESPACE);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('App', () => {
  it('shows a spinner until the context is resolved', async () => {
    bootstrapSucceeds();
    render();

    expect(screen.getByText('Starting Agent Space')).toBeInTheDocument();

    expect(await screen.findByTestId('app-routes')).toBeInTheDocument();
  });

  it('renders the layout around the routes once ready', async () => {
    bootstrapSucceeds();
    render();

    expect(await screen.findByTestId('app-routes')).toBeInTheDocument();
    expect(screen.getByTestId('workspaces-button')).toBeInTheDocument();
  });

  it('resolves the namespace with the config and client it just built', async () => {
    bootstrapSucceeds();
    render();
    await screen.findByTestId('app-routes');

    expect(createClientMock).toHaveBeenCalledWith(testConfig());
    expect(resolveNamespaceMock).toHaveBeenCalledWith(testConfig(), expect.anything());
  });

  it('explains a failed bootstrap and offers a way back to the dashboard', async () => {
    loadConfigMock.mockRejectedValue(new Error('config.json is malformed'));
    render();

    expect(await screen.findByText('Agent Space could not start')).toBeInTheDocument();
    expect(screen.getByText('config.json is malformed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to workspaces/i })).toHaveAttribute(
      'href',
      DEFAULT_CONFIG.dashboardUrl,
    );
  });

  it('retries the bootstrap on demand', async () => {
    loadConfigMock.mockRejectedValueOnce(new Error('offline'));
    createClientMock.mockResolvedValue(testClient());
    resolveNamespaceMock.mockResolvedValue(TEST_NAMESPACE);
    render();
    await screen.findByText('Agent Space could not start');

    loadConfigMock.mockResolvedValue(testConfig());
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByTestId('app-routes')).toBeInTheDocument();
  });
});
