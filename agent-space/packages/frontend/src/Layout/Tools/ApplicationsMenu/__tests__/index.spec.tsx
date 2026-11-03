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

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ApplicationsMenu } from '@/Layout/Tools/ApplicationsMenu';
import { ApplicationInfo } from '@/services/dashboard';

const CONSOLE_APP: ApplicationInfo = {
  url: 'https://console.example.com',
  title: 'OpenShift console',
  icon: '/dashboard/assets/console.svg',
  group: 'Cluster',
};
const REGISTRY_APP: ApplicationInfo = {
  url: 'https://registry.example.com',
  title: 'Devfile registry',
  icon: '/dashboard/assets/registry.svg',
};

async function openMenu(): Promise<void> {
  await userEvent.click(screen.getByTestId('applications-menu-toggle'));
}

describe('ApplicationsMenu', () => {
  it('is the grid toggle the dashboard masthead carries', () => {
    render(<ApplicationsMenu applications={[CONSOLE_APP]} />);

    const toggle = screen.getByTestId('applications-menu-toggle');
    expect(toggle).toHaveAttribute('aria-label', 'External Applications');
    expect(toggle).toHaveClass('pf-m-plain');
  });

  it('keeps the menu closed until the toggle is clicked', async () => {
    render(<ApplicationsMenu applications={[CONSOLE_APP]} />);
    expect(screen.queryByText('OpenShift console')).not.toBeInTheDocument();

    await openMenu();

    expect(screen.getByText('OpenShift console')).toBeInTheDocument();
  });

  it('opens each application in a new tab', async () => {
    render(<ApplicationsMenu applications={[CONSOLE_APP]} />);

    await openMenu();

    const link = screen.getByText('OpenShift console').closest('a');
    expect(link).toHaveAttribute('href', CONSOLE_APP.url);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows the icon the cluster published for each application', async () => {
    render(<ApplicationsMenu applications={[CONSOLE_APP]} />);

    await openMenu();

    expect(screen.getByRole('presentation')).toHaveAttribute('src', CONSOLE_APP.icon);
  });

  it('lists each application under the group it belongs to', async () => {
    render(<ApplicationsMenu applications={[CONSOLE_APP, REGISTRY_APP]} />);

    await openMenu();

    expect(screen.getByText('Cluster')).toBeInTheDocument();
    expect(screen.getByText('Applications')).toBeInTheDocument();
  });

  it('leaves out the default group when every application is grouped', async () => {
    render(<ApplicationsMenu applications={[CONSOLE_APP]} />);

    await openMenu();

    expect(screen.queryByText('Applications')).not.toBeInTheDocument();
  });

  it('closes once an application is chosen', async () => {
    render(<ApplicationsMenu applications={[CONSOLE_APP]} />);
    await openMenu();

    fireEvent.click(screen.getByRole('menuitem', { name: 'OpenShift console' }));

    await waitFor(() =>
      expect(screen.getByTestId('applications-menu-toggle')).toHaveAttribute(
        'aria-expanded',
        'false',
      ),
    );
  });
});
