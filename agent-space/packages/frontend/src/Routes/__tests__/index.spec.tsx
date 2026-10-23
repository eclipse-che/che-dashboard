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

import { screen } from '@testing-library/react';
import React from 'react';

import { AppRoutes, buildSandboxDetailsRoute, ROUTE } from '@/Routes';
import { renderInApp } from '@/testUtils';

jest.mock('@/pages/GettingStarted', () => ({
  GettingStarted: () => <div data-testid="page-getting-started" />,
}));
jest.mock('@/pages/CreateSandbox', () => ({
  CreateSandbox: () => <div data-testid="page-create" />,
}));
jest.mock('@/pages/SandboxList', () => ({
  SandboxList: () => <div data-testid="page-list" />,
}));
jest.mock('@/pages/SandboxDetails', () => ({
  SandboxDetails: () => <div data-testid="page-details" />,
}));

describe('buildSandboxDetailsRoute', () => {
  it('builds the details path', () => {
    expect(buildSandboxDetailsRoute('hello-world')).toBe('/sandboxes/hello-world');
  });

  it('escapes a name that would break the path', () => {
    expect(buildSandboxDetailsRoute('a/b')).toBe('/sandboxes/a%2Fb');
  });
});

describe('AppRoutes', () => {
  it.each([
    [ROUTE.GETTING_STARTED, 'page-getting-started'],
    [ROUTE.CREATE, 'page-create'],
    [ROUTE.SANDBOXES, 'page-list'],
    ['/sandboxes/hello-world', 'page-details'],
  ])('renders %s', (route, testId) => {
    renderInApp(<AppRoutes />, { route });

    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it('sends an unknown route to the sandbox list', () => {
    renderInApp(<AppRoutes />, { route: '/nowhere' });

    expect(screen.getByTestId('page-list')).toBeInTheDocument();
  });

  it('sends the root to the sandbox list', () => {
    renderInApp(<AppRoutes />, { route: '/' });

    expect(screen.getByTestId('page-list')).toBeInTheDocument();
  });
});
