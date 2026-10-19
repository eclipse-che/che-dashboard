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

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { useToggleBars } from '@/contexts/ToggleBars';
import { Layout } from '@/Layout';
import { BRANDING_ASSETS_PATH } from '@/services/branding';
import { KubeSandboxClient } from '@/services/client/kubeClient';
import { renderInApp, testConfig } from '@/testUtils';

const DEFAULT_LOGO_URL = `${BRANDING_ASSETS_PATH}che-logo.svg`;

/**
 * The sidebar starts collapsed in JSDOM, so its links are not exposed to the
 * accessibility tree and have to be reached by text.
 */
function navLink(label: string): HTMLElement {
  const link = screen.getByText(label).closest('a');
  if (link === null) {
    throw new Error(`No navigation link labelled '${label}'.`);
  }
  return link;
}

/** Answers `product.json` with the given overrides and 404s everything else. */
function stubBrandingFetch(product: Record<string, string>): void {
  window.fetch = jest.fn((url: string) =>
    url.endsWith('product.json')
      ? Promise.resolve({ ok: true, json: () => Promise.resolve(product) } as Response)
      : Promise.resolve({ ok: false, status: 404 } as Response),
  ) as unknown as typeof window.fetch;
}

/**
 * The masthead resolves its logo asynchronously, so every test has to let that
 * settle before it ends - otherwise the state update lands outside act().
 */
async function waitForLogo(src = DEFAULT_LOGO_URL): Promise<HTMLElement> {
  const logo = screen.getByTestId('branding-logo');
  await waitFor(() => expect(logo).toHaveAttribute('src', src));
  return logo;
}

describe('Layout', () => {
  beforeEach(() => {
    // The themed logo is cached in session storage, which otherwise carries
    // whatever the previous test resolved into the next one.
    window.sessionStorage.clear();
    stubBrandingFetch({});
  });

  it('renders the page content', async () => {
    renderInApp(
      <Layout>
        <div data-testid="page-content">Sandboxes</div>
      </Layout>,
    );

    expect(screen.getByTestId('page-content')).toBeInTheDocument();
    await waitForLogo();
  });

  it('links back to the classic dashboard workspaces page', async () => {
    renderInApp(<Layout>content</Layout>, {
      config: testConfig({ dashboardUrl: '../#/workspaces' }),
    });

    expect(screen.getByTestId('workspaces-button')).toHaveAttribute('href', '../#/workspaces');
    await waitForLogo();
  });

  it('warns that the data is a demo when the cluster is unreachable', async () => {
    renderInApp(<Layout>content</Layout>);

    expect(screen.getByTestId('mock-mode-label')).toHaveTextContent('Demo data');
    await waitForLogo();
  });

  it('does not warn about demo data when talking to a cluster', async () => {
    renderInApp(<Layout>content</Layout>, { client: new KubeSandboxClient('') });

    expect(screen.queryByTestId('mock-mode-label')).not.toBeInTheDocument();
    await waitForLogo();
  });

  it('offers the three sections of the app', async () => {
    renderInApp(<Layout>content</Layout>);

    expect(navLink('Getting Started')).toHaveAttribute('href', '/getting-started');
    expect(navLink('Create Sandbox')).toHaveAttribute('href', '/create');
    expect(navLink('Sandboxes')).toHaveAttribute('href', '/sandboxes');
    await waitForLogo();
  });

  it('marks the section matching the current location as active', async () => {
    renderInApp(<Layout>content</Layout>, { route: '/sandboxes/hello-world' });

    expect(navLink('Sandboxes')).toHaveClass('pf-m-current');
    expect(navLink('Create Sandbox')).not.toHaveClass('pf-m-current');
    await waitForLogo();
  });

  it('names the application in the tooltip of each section', async () => {
    renderInApp(<Layout>content</Layout>);

    // The tooltip hangs off the label inside the link, not off the link.
    await userEvent.hover(screen.getByText('Getting Started'));

    expect(await screen.findByRole('tooltip', undefined, { timeout: 3000 })).toHaveTextContent(
      'Agent Space/Getting Started',
    );
    await waitForLogo();
  });

  describe('giving a page the whole window', () => {
    /** Calls into the context the way an expanded manifest tab does. */
    function BarsToggle(): React.ReactElement {
      const { hideAll, showAll } = useToggleBars();
      return (
        <>
          <button data-testid="hide-bars" onClick={hideAll}>
            hide
          </button>
          <button data-testid="show-bars" onClick={showAll}>
            show
          </button>
        </>
      );
    }

    function masthead(): HTMLElement {
      const element = screen.getByTestId('branding-logo').closest('header');
      if (element === null) {
        throw new Error('The masthead is not rendered.');
      }
      return element;
    }

    it('takes the masthead and the sidebar away, and puts them back', async () => {
      renderInApp(
        <Layout>
          <BarsToggle />
        </Layout>,
      );
      await waitForLogo();
      // identity-obj-proxy maps a CSS module key to its own name.
      expect(masthead()).toHaveClass('showHeader');
      expect(navLink('Sandboxes')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('hide-bars'));

      expect(masthead()).toHaveClass('hideHeader');
      expect(screen.queryByText('Sandboxes')).not.toBeInTheDocument();

      await userEvent.click(screen.getByTestId('show-bars'));

      expect(masthead()).toHaveClass('showHeader');
      expect(navLink('Sandboxes')).toBeInTheDocument();
    });
  });

  describe('branding', () => {
    it('wears the same logo as the dashboard', async () => {
      renderInApp(<Layout>content</Layout>);

      expect(await waitForLogo()).toHaveAttribute('alt', 'Eclipse Che');
    });

    it('follows the product the dashboard is branded as', async () => {
      stubBrandingFetch({ title: 'Dev Spaces', logoFile: 'dev-spaces.png' });

      renderInApp(<Layout>content</Layout>);

      const logo = await waitForLogo(`${BRANDING_ASSETS_PATH}dev-spaces.png`);
      expect(logo).toHaveAttribute('alt', 'Dev Spaces');
    });
  });
});
