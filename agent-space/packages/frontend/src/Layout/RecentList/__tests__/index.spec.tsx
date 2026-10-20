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

import { Nav } from '@patternfly/react-core';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { MAX_RECENT_SANDBOXES, RecentSandboxes } from '@/Layout/RecentList';
import { AgentSandboxClient, Sandbox } from '@/services/types';
import { unloadedState } from '@/store/Sandboxes/reducer';
import { renderInApp, TEST_NAMESPACE, testClient, testConfig } from '@/testUtils';

const DASHBOARD_URL = 'https://che.example.com/dashboard/#/workspaces';

function sandbox(name: string, overrides: Partial<Sandbox['metadata']> = {}): Sandbox {
  return {
    metadata: {
      name,
      namespace: 'user-ns',
      uid: `uid-${name}`,
      creationTimestamp: '2025-01-01T00:00:00Z',
      ...overrides,
    },
    spec: { podTemplate: { spec: { containers: [{ name: 'agent', image: 'image:1' }] } } },
  };
}

/** `NavItem` reads the surrounding `Nav` through context, as it does in the sidebar. */
function renderList(sandboxes: Sandbox[], route = '/', client?: AgentSandboxClient) {
  return renderInApp(
    <Nav aria-label="Agent Space navigation">
      <RecentSandboxes />
    </Nav>,
    {
      route,
      client,
      config: testConfig({ dashboardUrl: DASHBOARD_URL }),
      preloadedState: {
        sandboxes: { ...unloadedState, isLoaded: true, sandboxes },
      },
    },
  );
}

/** Names of the sandboxes the sidebar lists, in the order they are shown. */
function listedNames(): (string | null)[] {
  return screen.getAllByTestId(/^recent-sandbox-/).map(item => item.textContent);
}

async function openKebab(name: string): Promise<void> {
  await userEvent.click(screen.getByTestId(`recent-actions-${name}`));
}

/** The test id is on the `li`; the button that acts on it is inside. */
async function clickAction(key: string): Promise<void> {
  const item = screen.getByTestId(`recent-action-${key}`);
  await userEvent.click(within(item).getByRole('menuitem'));
}

describe('RecentSandboxes', () => {
  it('adds no heading to the sidebar until there is a sandbox to list', () => {
    renderList([]);

    expect(screen.queryByText('RECENT SANDBOXES')).toBeNull();
    expect(screen.queryAllByTestId(/^recent-sandbox-/)).toEqual([]);
  });

  it('lists the sandboxes under a heading of their own', () => {
    renderList([sandbox('alpha')]);

    expect(screen.getByText('RECENT SANDBOXES')).toBeInTheDocument();
    expect(screen.getByTestId('recent-sandbox-alpha')).toHaveTextContent('alpha');
  });

  it('shows the phase next to each name', () => {
    renderList([sandbox('alpha')]);

    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      'Agent space alpha status is Pending',
    );
  });

  it('leads with the newest sandbox', () => {
    renderList([
      sandbox('older', { creationTimestamp: '2025-01-01T00:00:00Z' }),
      sandbox('newer', { creationTimestamp: '2025-06-01T00:00:00Z' }),
    ]);

    expect(listedNames()).toEqual(['newer', 'older']);
  });

  it('sorts a sandbox the cluster has not timestamped yet last', () => {
    renderList([sandbox('undated', { creationTimestamp: undefined }), sandbox('dated')]);

    expect(listedNames()).toEqual(['dated', 'undated']);
  });

  it('keeps the sidebar short by listing only the most recent few', () => {
    const many = Array.from({ length: MAX_RECENT_SANDBOXES + 3 }, (_, index) =>
      sandbox(`agent-${index}`, {
        creationTimestamp: `2025-01-0${index + 1}T00:00:00Z`,
      }),
    );

    renderList(many);

    expect(listedNames()).toHaveLength(MAX_RECENT_SANDBOXES);
  });

  it('goes to the details page of the sandbox that was clicked', async () => {
    renderList([sandbox('alpha')]);

    await userEvent.click(screen.getByTestId('recent-sandbox-alpha'));

    await waitFor(() =>
      expect(screen.getByTestId('recent-sandbox-alpha')).toHaveClass('pf-m-current'),
    );
  });

  it('opens a sandbox from the keyboard', async () => {
    renderList([sandbox('alpha')]);

    screen.getByTestId('recent-sandbox-alpha').focus();
    await userEvent.keyboard('{Enter}');

    await waitFor(() =>
      expect(screen.getByTestId('recent-sandbox-alpha')).toHaveClass('pf-m-current'),
    );
  });

  it('leaves the item alone for keys that are not Enter or Space', async () => {
    renderList([sandbox('alpha')]);

    screen.getByTestId('recent-sandbox-alpha').focus();
    await userEvent.keyboard('{ArrowDown}');

    expect(screen.getByTestId('recent-sandbox-alpha')).not.toHaveClass('pf-m-current');
  });

  it('marks the sandbox whose details page is open', () => {
    renderList([sandbox('alpha'), sandbox('beta')], '/sandboxes/beta');

    expect(screen.getByTestId('recent-sandbox-beta')).toHaveClass('pf-m-current');
    expect(screen.getByTestId('recent-sandbox-alpha')).not.toHaveClass('pf-m-current');
  });

  describe('the kebab', () => {
    it('offers the actions the phase of the sandbox allows', async () => {
      renderList([sandbox('alpha')]);

      await openKebab('alpha');

      expect(screen.getByTestId('recent-action-suspend')).toHaveTextContent('Suspend');
      expect(screen.getByTestId('recent-action-delete')).toHaveTextContent('Delete');
    });

    it('does not open the sandbox when the kebab itself is clicked', async () => {
      renderList([sandbox('alpha')]);

      await openKebab('alpha');

      expect(screen.getByTestId('recent-sandbox-alpha')).not.toHaveClass('pf-m-current');
    });

    it('suspends the sandbox it belongs to', async () => {
      const client = testClient();
      const patch = jest.spyOn(client, 'patchSandbox');
      renderList([sandbox('alpha')], '/', client);

      await openKebab('alpha');
      await clickAction('suspend');

      await waitFor(() =>
        expect(patch).toHaveBeenCalledWith(TEST_NAMESPACE, 'alpha', {
          spec: { operatingMode: 'Suspended' },
        }),
      );
    });

    it('asks before deleting the sandbox', async () => {
      const client = testClient();
      const remove = jest.spyOn(client, 'deleteSandbox');
      renderList([sandbox('alpha')], '/', client);

      await openKebab('alpha');
      await clickAction('delete');
      expect(remove).not.toHaveBeenCalled();

      expect(screen.getByRole('dialog')).toHaveTextContent('delete the agent space "alpha"');
      await userEvent.click(screen.getByTestId('confirmation-checkbox'));
      await userEvent.click(screen.getByTestId('delete-sandbox-button'));

      await waitFor(() => expect(remove).toHaveBeenCalledWith(TEST_NAMESPACE, 'alpha'));
    });

    it('closes the confirmation without deleting on Cancel', async () => {
      const client = testClient();
      const remove = jest.spyOn(client, 'deleteSandbox');
      renderList([sandbox('alpha')], '/', client);

      await openKebab('alpha');
      await clickAction('delete');
      await userEvent.click(screen.getByTestId('close-button'));

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(remove).not.toHaveBeenCalled();
    });

    it('leaves the details page closed when Enter lands on the kebab', async () => {
      renderList([sandbox('alpha')]);

      screen.getByTestId('recent-actions-alpha').focus();
      await userEvent.keyboard('{Enter}');

      expect(screen.getByTestId('recent-action-delete')).toBeInTheDocument();
      expect(screen.getByTestId('recent-sandbox-alpha')).not.toHaveClass('pf-m-current');
    });
  });
});
