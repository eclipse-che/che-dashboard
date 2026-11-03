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
import userEvent from '@testing-library/user-event';
import { detect } from 'detect-browser';
import React from 'react';

import { AboutMenu, Props } from '@/Layout/Tools/AboutMenu';

jest.mock('detect-browser', () => ({ detect: jest.fn() }));
const mockDetect = detect as jest.MockedFunction<typeof detect>;

/** What `detect()` reports for a real browser, as the dialog consumes it. */
const CHROME = {
  type: 'browser',
  name: 'chrome',
  version: '154.0.0',
  os: 'Mac OS',
} as ReturnType<typeof detect>;

const LINKS = [
  { text: 'Documentation', href: 'https://www.eclipse.org/che/docs/' },
  { text: 'Community', href: 'https://www.eclipse.org/che/' },
];

function renderMenu(overrides: Partial<Props> = {}): void {
  render(
    <AboutMenu
      links={LINKS}
      productName="Eclipse Che"
      productVersion="7.104.0"
      username="kubeadmin"
      logoSrc="/dashboard/assets/branding/che-logo.svg"
      {...overrides}
    />,
  );
}

async function openMenu(): Promise<void> {
  await userEvent.click(screen.getByTestId('about-menu-toggle'));
}

async function openAbout(): Promise<HTMLElement> {
  await openMenu();
  // `data-testid` lands on the list item; the handler sits on the button it wraps.
  await userEvent.click(screen.getByRole('menuitem', { name: 'About' }));
  return screen.findByRole('dialog');
}

describe('AboutMenu', () => {
  const originalVersion = process.env.DASHBOARD_VERSION;

  beforeEach(() => {
    mockDetect.mockReturnValue(CHROME);
    // Webpack defines this at build time; Jest has to stand in for it.
    process.env.DASHBOARD_VERSION = '7.123.0-next';
  });

  afterEach(() => {
    process.env.DASHBOARD_VERSION = originalVersion;
  });

  it('is the question-mark toggle the dashboard masthead carries', () => {
    renderMenu();

    const toggle = screen.getByTestId('about-menu-toggle');
    expect(toggle).toHaveAttribute('aria-label', 'About Menu');
    expect(toggle).toHaveClass('pf-m-plain');
  });

  it('offers the help links the product is branded with', async () => {
    renderMenu();

    await openMenu();

    LINKS.forEach(link => expect(screen.getByText(link.text)).toBeInTheDocument());
  });

  it('opens a help link in a new tab', async () => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);
    renderMenu();
    await openMenu();

    await userEvent.click(screen.getByText('Documentation'));

    expect(open).toHaveBeenCalledWith(LINKS[0].href, '_blank');
    open.mockRestore();
  });

  it('keeps the About dialog closed until it is asked for', () => {
    renderMenu();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reports the product, its version and who is signed in', async () => {
    renderMenu();

    const dialog = await openAbout();

    expect(dialog).toHaveTextContent('Eclipse Che');
    expect(screen.getByTestId('server-version')).toHaveTextContent('7.104.0');
    expect(screen.getByTestId('username')).toHaveTextContent('kubeadmin');
  });

  it('leaves out what the cluster did not report', async () => {
    renderMenu({ productVersion: undefined, username: '' });

    await openAbout();

    expect(screen.queryByTestId('server-version')).not.toBeInTheDocument();
    expect(screen.queryByTestId('username')).not.toBeInTheDocument();
  });

  it('reports the same six values the dashboard About dialog does', async () => {
    renderMenu();

    await openAbout();

    expect(screen.getByTestId('dashboard-version')).toHaveTextContent('7.123.0-next');
    expect(screen.getByTestId('server-version')).toHaveTextContent('7.104.0');
    expect(screen.getByTestId('username')).toHaveTextContent('kubeadmin');
    expect(screen.getByTestId('browser-name')).toHaveTextContent('chrome');
    expect(screen.getByTestId('browser-version')).toHaveTextContent('154.0.0');
    expect(screen.getByTestId('browser-os')).toHaveTextContent('Mac OS');
  });

  it('omits the browser rows when the agent cannot be identified', async () => {
    mockDetect.mockReturnValue(null);
    renderMenu();

    await openAbout();

    expect(screen.queryByTestId('browser-name')).not.toBeInTheDocument();
    expect(screen.queryByTestId('browser-version')).not.toBeInTheDocument();
    expect(screen.queryByTestId('browser-os')).not.toBeInTheDocument();
  });

  it('omits the dashboard version when the bundle was built without it', async () => {
    delete process.env.DASHBOARD_VERSION;
    renderMenu();

    await openAbout();

    expect(screen.queryByTestId('dashboard-version')).not.toBeInTheDocument();
  });

  it('shows the branded logo in the dialog', async () => {
    renderMenu();

    await openAbout();

    expect(screen.getByAltText('Eclipse Che logo')).toHaveAttribute(
      'src',
      '/dashboard/assets/branding/che-logo.svg',
    );
  });

  it('closes the dialog again', async () => {
    renderMenu();
    await openAbout();

    await userEvent.click(screen.getByRole('button', { name: /close/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
