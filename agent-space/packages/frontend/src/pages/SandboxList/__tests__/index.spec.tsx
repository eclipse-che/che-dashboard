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

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { SandboxList } from '@/pages/SandboxList';
import { ROUTE } from '@/Routes';
import { AiProviderDefinition, AiToolDefinition, EMPTY_CATALOG } from '@/services/catalog';
import { MockSandboxClient } from '@/services/client/mockClient';
import { AI_PROVIDERS_ANNOTATION } from '@/services/sandboxFactory';
import { AgentSandboxClient, Sandbox, SandboxClientError, SandboxPhase } from '@/services/types';
import { unloadedState as catalogUnloadedState } from '@/store/Catalog/reducer';
import { sandboxesActionCreators } from '@/store/Sandboxes';
import {
  createTestStore,
  renderInApp,
  StoreOptions,
  TEST_NAMESPACE,
  testClient,
  TestStore,
} from '@/testUtils';

const CLAUDE: AiToolDefinition = {
  providerId: 'anthropic',
  tag: 'latest',
  name: 'Claude Code',
  url: '',
  binary: 'claude',
  pattern: 'init',
  injectorImage: 'quay.io/example/claude-code:latest',
};

const ANTHROPIC: AiProviderDefinition = {
  id: 'anthropic',
  name: 'Anthropic',
  publisher: 'Anthropic',
  icon: '/images/anthropic.svg',
};

/** Store that already knows the catalogues, as the bootstrap leaves it. */
const WITH_CATALOG: StoreOptions['preloadedState'] = {
  catalog: {
    ...catalogUnloadedState,
    isLoaded: true,
    catalog: { ...EMPTY_CATALOG, aiTools: [CLAUDE], aiProviders: [ANTHROPIC] },
  },
};

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

/** Sandbox carrying the annotations the create flow writes. */
function annotatedSandbox(name: string, annotations: Record<string, string>): Sandbox {
  return {
    metadata: { name, annotations },
    spec: { podTemplate: { spec: { containers: [{ name: 'agent', image: 'busybox' }] } } },
  };
}

/**
 * The list itself no longer fetches: the namespace watch the application opens
 * feeds it. The tests open that watch the same way the application does.
 */
let watching: TestStore | undefined;

async function watchingStore(
  client: AgentSandboxClient,
  preloadedState?: StoreOptions['preloadedState'],
): Promise<TestStore> {
  const store = createTestStore({ client, preloadedState });
  await store.dispatch(sandboxesActionCreators.startWatchingSandboxes());
  watching = store;
  return store;
}

async function renderList(client = testClient(), preloadedState?: StoreOptions['preloadedState']) {
  const store = await watchingStore(client, preloadedState);
  const result = renderInApp(<SandboxList />, { store });
  await screen.findByTestId('sandboxes-table');
  return result;
}

afterEach(() => {
  watching?.dispatch(sandboxesActionCreators.stopWatchingSandboxes());
  watching = undefined;
});

function rowOf(name: string): HTMLElement {
  return screen.getByTestId(`sandbox-row-${name}`);
}

/** Names of the sandboxes the table lists, in the order they are shown. */
function listedNames(): string[] {
  return screen
    .queryAllByTestId(/^sandbox-row-/)
    .map(row => (row.getAttribute('data-testid') ?? '').replace('sandbox-row-', ''));
}

async function check(name: string): Promise<void> {
  await userEvent.click(within(rowOf(name)).getByRole('checkbox'));
}

async function openActions(name: string): Promise<void> {
  await userEvent.click(within(rowOf(name)).getByRole('button', { name: 'Kebab toggle' }));
}

describe('SandboxList', () => {
  it('says which application the page belongs to', async () => {
    await renderList();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Agent Space/Sandboxes');
  });

  it('lists the sandboxes of the namespace', async () => {
    await renderList();

    expect(screen.getAllByRole('row')).toHaveLength(5);
    ['hello-world', 'openclaw-agent', 'nemoclaw-sandbox', 'sandboxed-tools'].forEach(name =>
      expect(rowOf(name)).toBeInTheDocument(),
    );
  });

  it('shows the phase of each sandbox', async () => {
    await renderList();

    expect(within(rowOf('hello-world')).getByTestId('sandbox-status')).toHaveTextContent(
      SandboxPhase.RUNNING,
    );
    expect(within(rowOf('openclaw-agent')).getByTestId('sandbox-status')).toHaveTextContent(
      SandboxPhase.SUSPENDED,
    );
    expect(within(rowOf('nemoclaw-sandbox')).getByTestId('sandbox-status')).toHaveTextContent(
      SandboxPhase.BLOCKED,
    );
    expect(within(rowOf('sandboxed-tools')).getByTestId('sandbox-status')).toHaveTextContent(
      SandboxPhase.COMPLETED,
    );
  });

  it('renders the spec columns', async () => {
    await renderList();
    const row = rowOf('hello-world');

    expect(row).toHaveTextContent('ghcr.io/openclaw/openclaw:2026.3.23');
    // Runtime class and limits belong to the details page, not to the list.
    expect(row).not.toHaveTextContent('gvisor');
    expect(row).not.toHaveTextContent('cpu: 2, memory: 4Gi');
  });

  it('offers only the actions the phase allows', async () => {
    await renderList();

    await openActions('hello-world');
    expect(screen.getByRole('menuitem', { name: 'Suspend' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Resume' })).not.toBeInTheDocument();
  });

  it('offers Resume for a suspended sandbox', async () => {
    await renderList();

    await openActions('openclaw-agent');
    expect(screen.getByRole('menuitem', { name: 'Resume' })).toBeInTheDocument();
  });

  it('offers no lifecycle action once the sandbox has finished', async () => {
    await renderList();

    await openActions('sandboxed-tools');
    expect(screen.getAllByRole('menuitem').map(item => item.textContent)).toEqual(['Delete']);
  });

  it('shows the new phase the watch reports after a lifecycle action', async () => {
    await renderList();

    await openActions('hello-world');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Suspend' }));

    await waitFor(() =>
      expect(within(rowOf('hello-world')).getByTestId('sandbox-status')).toHaveTextContent(
        SandboxPhase.SUSPENDED,
      ),
    );
  });

  it('reports a failed action without losing the list', async () => {
    const client = testClient();
    jest.spyOn(client, 'patchSandbox').mockRejectedValue(new SandboxClientError(403, 'Forbidden.'));
    await renderList(client);

    await openActions('hello-world');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Suspend' }));

    expect(await screen.findByTestId('error-alert')).toHaveTextContent('do not have permission');
    expect(rowOf('hello-world')).toBeInTheDocument();
  });

  it('deletes a sandbox only after the confirmation is acknowledged', async () => {
    const client = testClient();
    const deleteSpy = jest.spyOn(client, 'deleteSandbox');
    await renderList(client);

    await openActions('hello-world');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(deleteSpy).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('confirmation-checkbox'));
    await userEvent.click(screen.getByTestId('delete-sandbox-button'));

    expect(deleteSpy).toHaveBeenCalledWith(TEST_NAMESPACE, 'hello-world');
    await waitFor(() => expect(screen.queryByTestId('sandbox-row-hello-world')).toBeNull());
  });

  it('sends Create Sandbox to the far end, as the workspace list does', async () => {
    await renderList();

    const create = screen.getByTestId('create-sandbox-button');
    const position = screen
      .getByTestId('bulk-delete-button')
      .compareDocumentPosition(create.closest('.pf-v6-c-toolbar__item') as Node);

    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(create.closest('.pf-m-align-end')).not.toBeNull();
  });

  it('collapses the actions into a toggle group on a narrow screen', async () => {
    await renderList();

    // The same group the workspace list uses, so both toolbars fold the same
    // way rather than overflowing.
    const group = screen.getByTestId('create-sandbox-button').closest('.pf-m-toggle-group');
    expect(group).not.toBeNull();
    expect(group).toContainElement(screen.getByTestId('bulk-delete-button'));
  });

  it('goes to the create page from Create Sandbox', async () => {
    await renderList();

    await userEvent.click(screen.getByTestId('create-sandbox-button'));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTE.CREATE);
  });

  describe('the search', () => {
    async function search(text: string): Promise<void> {
      await userEvent.type(screen.getByTestId('sandboxes-filter-input'), text);
    }

    it('shows only the sandboxes the search names, once it is applied', async () => {
      await renderList();

      await search('hello');
      // Typing alone changes nothing, as it does not in the workspace list.
      expect(listedNames()).toHaveLength(4);

      await userEvent.keyboard('{Enter}');

      expect(listedNames()).toEqual(['hello-world']);
    });

    it('applies the search from the button as well as from Enter', async () => {
      await renderList();

      await search('openclaw');
      await userEvent.click(screen.getByTestId('sandboxes-filter-button'));

      expect(listedNames()).toEqual(['openclaw-agent']);
    });

    it('matches a word of the name, not only its beginning', async () => {
      await renderList();

      await search('world{Enter}');

      expect(listedNames()).toEqual(['hello-world']);
    });

    it('brings the whole list back on Escape', async () => {
      await renderList();

      await search('hello{Enter}');
      await userEvent.keyboard('{Escape}');

      expect(listedNames()).toHaveLength(4);
      expect(screen.getByTestId('sandboxes-filter-input')).toHaveValue('');
    });

    it('says so when nothing matches', async () => {
      await renderList();

      await search('no-such-sandbox{Enter}');

      expect(screen.getByTestId('nothing-found')).toHaveTextContent('Nothing Found');
      expect(listedNames()).toEqual([]);
    });

    it('ticks only the sandboxes the search left visible', async () => {
      const client = testClient();
      const deleteSpy = jest.spyOn(client, 'deleteSandbox');
      await renderList(client);

      await search('hello{Enter}');
      await userEvent.click(screen.getByTestId('select-all-checkbox'));
      await userEvent.click(screen.getByTestId('bulk-delete-button'));
      await userEvent.click(screen.getByTestId('confirmation-checkbox'));
      await userEvent.click(screen.getByTestId('delete-sandbox-button'));

      expect(deleteSpy).toHaveBeenCalledTimes(1);
      expect(deleteSpy).toHaveBeenCalledWith(TEST_NAMESPACE, 'hello-world');
    });

    it('forgets a tick the search has hidden', async () => {
      await renderList();

      await check('openclaw-agent');
      await search('hello{Enter}');

      expect(screen.getByTestId('bulk-delete-button')).toBeDisabled();
    });

    it('offers nothing to search while the namespace is empty', async () => {
      const client = testClient();
      jest.spyOn(client, 'listSandboxes').mockResolvedValue({ items: [] });
      const store = await watchingStore(client);
      renderInApp(<SandboxList />, { store });

      await screen.findByTestId('empty-getting-started-button');
      expect(screen.queryByTestId('sandboxes-filter-input')).toBeNull();
      expect(screen.queryByTestId('select-all-checkbox')).toBeNull();
      expect(screen.queryByTestId('bulk-delete-button')).toBeNull();
      // The way out of an empty namespace stays, as 'Add Workspace' does.
      expect(screen.getByTestId('create-sandbox-button')).toBeInTheDocument();
    });
  });

  describe('the bulk deletion', () => {
    it('has nothing to delete until a row is ticked', async () => {
      await renderList();

      expect(screen.getByTestId('bulk-delete-button')).toBeDisabled();
    });

    it('deletes every sandbox that was ticked', async () => {
      const client = testClient();
      const deleteSpy = jest.spyOn(client, 'deleteSandbox');
      await renderList(client);

      await check('hello-world');
      await check('openclaw-agent');
      await userEvent.click(screen.getByTestId('bulk-delete-button'));

      expect(screen.getByTestId('delete-sandbox-names')).toHaveTextContent('hello-world');
      expect(screen.getByTestId('delete-sandbox-names')).toHaveTextContent('openclaw-agent');

      await userEvent.click(screen.getByTestId('confirmation-checkbox'));
      await userEvent.click(screen.getByTestId('delete-sandbox-button'));

      expect(deleteSpy).toHaveBeenCalledWith(TEST_NAMESPACE, 'hello-world');
      expect(deleteSpy).toHaveBeenCalledWith(TEST_NAMESPACE, 'openclaw-agent');
      await waitFor(() => expect(screen.queryByTestId('sandbox-row-hello-world')).toBeNull());
      expect(screen.queryByTestId('sandbox-row-openclaw-agent')).toBeNull();
    });

    it('ticks and unticks every row at once', async () => {
      await renderList();

      await userEvent.click(screen.getByTestId('select-all-checkbox'));
      expect(screen.getByTestId('bulk-delete-button')).toBeEnabled();
      expect(within(rowOf('nemoclaw-sandbox')).getByRole('checkbox')).toBeChecked();

      await userEvent.click(screen.getByTestId('select-all-checkbox'));
      expect(screen.getByTestId('bulk-delete-button')).toBeDisabled();
    });

    it('unticks a row that was ticked by mistake', async () => {
      await renderList();

      await check('hello-world');
      await check('hello-world');

      expect(screen.getByTestId('bulk-delete-button')).toBeDisabled();
    });

    it('names the sandboxes it could not delete', async () => {
      const client = testClient();
      jest
        .spyOn(client, 'deleteSandbox')
        .mockRejectedValue(new SandboxClientError(403, 'Not allowed.'));
      await renderList(client);

      await check('hello-world');
      await check('openclaw-agent');
      await userEvent.click(screen.getByTestId('bulk-delete-button'));
      await userEvent.click(screen.getByTestId('confirmation-checkbox'));
      await userEvent.click(screen.getByTestId('delete-sandbox-button'));

      const alert = await screen.findByTestId('error-alert');
      expect(alert).toHaveTextContent('Failed to delete 2 of 2 sandboxes');
      expect(alert).toHaveTextContent('hello-world: Not allowed.');
    });

    it('forgets a ticked sandbox the watch has removed', async () => {
      const client = testClient();
      await renderList(client);

      await check('hello-world');
      await client.deleteSandbox(TEST_NAMESPACE, 'hello-world');

      await waitFor(() => expect(screen.queryByTestId('sandbox-row-hello-world')).toBeNull());
      expect(screen.getByTestId('bulk-delete-button')).toBeDisabled();
    });
  });

  it('adds a row for a sandbox the watch reports as created', async () => {
    const client = testClient();
    await renderList(client);

    await client.createSandbox(TEST_NAMESPACE, {
      metadata: { name: 'from-elsewhere' },
      spec: { podTemplate: { spec: { containers: [{ name: 'agent', image: 'busybox' }] } } },
    });

    expect(await screen.findByTestId('sandbox-row-from-elsewhere')).toBeInTheDocument();
  });

  it('invites the user to the samples when the namespace is empty', async () => {
    const client = testClient();
    jest.spyOn(client, 'listSandboxes').mockResolvedValue({ items: [] });
    const store = await watchingStore(client);
    renderInApp(<SandboxList />, { store });

    expect(await screen.findByTestId('empty-getting-started-button')).toBeInTheDocument();
    expect(screen.queryByTestId('sandboxes-table')).not.toBeInTheDocument();
  });

  it('reports a failed load', async () => {
    const client = testClient();
    jest
      .spyOn(client, 'listSandboxes')
      .mockRejectedValue(new SandboxClientError(404, 'Sandboxes not found.'));
    const store = await watchingStore(client);
    renderInApp(<SandboxList />, { store });

    expect(await screen.findByTestId('error-alert')).toHaveTextContent('CRDs may not be installed');
  });

  it('shows a sandbox created in another namespace nowhere', async () => {
    const client = new MockSandboxClient('other-ns', 0);
    const store = await watchingStore(client);
    renderInApp(<SandboxList />, { store });

    expect(await screen.findByTestId('empty-getting-started-button')).toBeInTheDocument();
  });

  it('says it is loading until the first answer arrives', () => {
    const store = createTestStore();
    renderInApp(<SandboxList />, { store });

    expect(screen.getByText('Loading sandboxes')).toBeInTheDocument();
    expect(screen.queryByTestId('sandboxes-table')).toBeNull();
  });

  it('leads with the status, as the dashboard workspaces table does', async () => {
    await renderList();

    expect(screen.getAllByRole('columnheader').map(header => header.textContent)).toEqual([
      'Row select',
      'Status',
      'Name',
      'AI Provider(s)',
      'Image',
      'Age',
      'Actions',
    ]);
    // The checkbox comes first, as it does in the dashboard workspaces table,
    // so the status is the first column that carries any information.
    expect(within(rowOf('hello-world')).getAllByRole('cell')[1]).toContainElement(
      within(rowOf('hello-world')).getByTestId('sandbox-status'),
    );
  });

  describe('the AI Provider(s) column', () => {
    it('names the agent the sandbox runs', async () => {
      const client = testClient();
      await renderList(client, WITH_CATALOG);

      await client.createSandbox(
        TEST_NAMESPACE,
        annotatedSandbox('with-agent', { [AI_PROVIDERS_ANNOTATION]: 'anthropic' }),
      );

      const row = await screen.findByTestId('sandbox-row-with-agent');
      expect(within(row).getByTestId('ai-tool-icon')).toHaveTextContent('Claude Code');
    });

    it('shows a dash for a sandbox that runs none', async () => {
      await renderList(testClient(), WITH_CATALOG);

      expect(within(rowOf('hello-world')).getAllByRole('cell')[3]).toHaveTextContent('-');
    });
  });
});
