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

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { BrandingState } from '@/hooks/useBranding';
import { HeaderTools } from '@/Layout/Tools';
import { ApplicationInfo, fetchApplications, fetchUsername } from '@/services/dashboard';

jest.mock('@/services/dashboard', () => ({
  fetchApplications: jest.fn(),
  fetchUsername: jest.fn(),
  signOut: jest.fn(),
}));

const mockFetchApplications = jest.mocked(fetchApplications);
const mockFetchUsername = jest.mocked(fetchUsername);

const CONSOLE_APP: ApplicationInfo = {
  url: 'https://console.example.com',
  title: 'OpenShift console',
  icon: '/dashboard/assets/console.svg',
};

const BRANDING: BrandingState = {
  title: 'Eclipse Che',
  name: 'Eclipse Che',
  links: [{ text: 'Documentation', href: 'https://www.eclipse.org/che/docs/' }],
  productVersion: '7.104.0',
  logoSrc: '/dashboard/assets/branding/che-logo.svg',
};

function renderTools(): void {
  render(<HeaderTools branding={BRANDING} userPreferencesUrl="../#/user-preferences" />);
}

describe('HeaderTools', () => {
  beforeEach(() => {
    mockFetchApplications.mockResolvedValue([]);
    mockFetchUsername.mockResolvedValue('');
  });

  it('always offers the About menu', async () => {
    renderTools();

    expect(screen.getByTestId('about-menu-toggle')).toBeInTheDocument();
    await waitFor(() => expect(mockFetchUsername).toHaveBeenCalled());
  });

  it('carries the three controls of the dashboard masthead', async () => {
    mockFetchApplications.mockResolvedValue([CONSOLE_APP]);
    mockFetchUsername.mockResolvedValue('kubeadmin');

    renderTools();

    await waitFor(() => expect(screen.getByTestId('applications-menu-toggle')).toBeInTheDocument());
    expect(screen.getByTestId('about-menu-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('user-menu-toggle')).toHaveTextContent('kubeadmin');
  });

  it('leaves out the applications menu when the cluster links none', async () => {
    mockFetchUsername.mockResolvedValue('kubeadmin');

    renderTools();

    await waitFor(() => expect(screen.getByTestId('user-menu-toggle')).toBeInTheDocument());
    expect(screen.queryByTestId('applications-menu-toggle')).not.toBeInTheDocument();
  });

  it('leaves out the user menu when no user could be read', async () => {
    mockFetchApplications.mockResolvedValue([CONSOLE_APP]);

    renderTools();

    await waitFor(() => expect(screen.getByTestId('applications-menu-toggle')).toBeInTheDocument());
    expect(screen.queryByTestId('user-menu-toggle')).not.toBeInTheDocument();
  });
});
