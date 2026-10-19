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

import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { useLocation } from 'react-router-dom';

import { EVENTS_REFRESH_INTERVAL_MS, SandboxDetails } from '@/pages/SandboxDetails';
import { SANDBOX_TAB } from '@/Routes';
import { AiProviderDefinition, AiToolDefinition, EMPTY_CATALOG } from '@/services/catalog';
import { MockSandboxClient } from '@/services/client/mockClient';
import { AI_PROVIDERS_ANNOTATION, ORIGINAL_MANIFEST_ANNOTATION } from '@/services/sandboxFactory';
import { Sandbox, SandboxClientError, SandboxPhase } from '@/services/types';
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

// The page is about tabs and actions, not about the editor; see the mock for
// why the real CodeMirror does not belong in this suite.
jest.mock('@/components/ManifestViewer');

// Mounting the real tab opens a shell against xterm, which needs a canvas
// JSDOM does not have. Whether the tab is offered at all is what matters here.
jest.mock('@/pages/SandboxDetails/TerminalTab', () => ({
  TerminalTab: ({ namespace, sandboxName }: { namespace: string; sandboxName: string }) => (
    <div data-testid="terminal-tab">{`${namespace}/${sandboxName}`}</div>
  ),
}));

const mockNavigate = jest.fn();
let currentName = 'hello-world';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ name: currentName }),
}));

let watching: TestStore | undefined;

/** Makes the router's query string assertable; `MemoryRouter` does not touch `window.location`. */
function LocationProbe(): React.ReactElement {
  return <span data-testid="location-search">{useLocation().search}</span>;
}

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
};

/** Store that already knows the AI registry of the cluster. */
const WITH_CATALOG = {
  catalog: {
    ...catalogUnloadedState,
    isLoaded: true,
    catalog: { ...EMPTY_CATALOG, aiTools: [CLAUDE], aiProviders: [ANTHROPIC] },
  },
};

async function renderDetails(
  name: string,
  {
    client = testClient(),
    tab,
    preloadedState,
  }: {
    client?: MockSandboxClient;
    tab?: string;
    preloadedState?: StoreOptions['preloadedState'];
  } = {},
) {
  currentName = name;
  const store = createTestStore({ client, preloadedState });
  // The page is fed by the namespace watch the application opens, so the tests
  // open it too.
  await store.dispatch(sandboxesActionCreators.startWatchingSandboxes());
  watching = store;

  const route = tab === undefined ? `/sandboxes/${name}` : `/sandboxes/${name}?tab=${tab}`;
  const result = renderInApp(
    <>
      <SandboxDetails />
      <LocationProbe />
    </>,
    { store, route },
  );
  await screen.findByRole('heading', { level: 1, name });
  return result;
}

function activeTab(): string | null {
  return screen.getByRole('tab', { selected: true }).textContent;
}

beforeEach(() => {
  mockNavigate.mockClear();
  currentName = 'hello-world';
});

afterEach(() => {
  watching?.dispatch(sandboxesActionCreators.stopWatchingSandboxes());
  watching = undefined;
});

describe('SandboxDetails', () => {
  it('leads back to the list it came from', async () => {
    await renderDetails('hello-world');

    await userEvent.click(screen.getByText('Agent Space/Sandboxes'));

    expect(mockNavigate).toHaveBeenCalledWith('/sandboxes');
  });

  it('shows the phase next to the name', async () => {
    await renderDetails('hello-world');

    expect(screen.getByTestId('sandbox-status')).toHaveTextContent(SandboxPhase.RUNNING);
  });

  describe('tabs', () => {
    it('opens on Overview', async () => {
      await renderDetails('hello-world');

      expect(activeTab()).toBe(SANDBOX_TAB.OVERVIEW);
      expect(screen.getByTestId('overview-tab')).toBeVisible();
    });

    it('opens the tab named in the query string', async () => {
      await renderDetails('hello-world', { tab: SANDBOX_TAB.EVENTS });

      expect(activeTab()).toBe(SANDBOX_TAB.EVENTS);
      expect(screen.getByTestId('events-tab')).toBeVisible();
    });

    it('falls back to Overview for a tab it does not know', async () => {
      await renderDetails('hello-world', { tab: 'Nonsense' });

      expect(activeTab()).toBe(SANDBOX_TAB.OVERVIEW);
    });

    it('records the chosen tab in the query string', async () => {
      await renderDetails('hello-world');

      await userEvent.click(screen.getByRole('tab', { name: SANDBOX_TAB.MANIFEST }));

      expect(activeTab()).toBe(SANDBOX_TAB.MANIFEST);
      expect(screen.getByTestId('manifest-tab')).toBeVisible();
      await waitFor(() =>
        expect(screen.getByTestId('location-search')).toHaveTextContent('?tab=Manifest'),
      );
    });

    it('offers a terminal while the sandbox runs', async () => {
      await renderDetails('hello-world');

      expect(screen.getByRole('tab', { name: SANDBOX_TAB.TERMINAL })).toBeInTheDocument();
    });

    it('opens the shell only once the tab is the one on screen', async () => {
      await renderDetails('hello-world');
      expect(screen.queryByTestId('terminal-tab')).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('tab', { name: SANDBOX_TAB.TERMINAL }));

      expect(activeTab()).toBe(SANDBOX_TAB.TERMINAL);
      expect(screen.getByTestId('terminal-tab')).toHaveTextContent(`${TEST_NAMESPACE}/hello-world`);
    });

    it('hides the terminal when there is no running pod to open one in', async () => {
      await renderDetails('nemoclaw-sandbox');

      expect(screen.getByTestId('sandbox-status')).toHaveTextContent(SandboxPhase.BLOCKED);
      expect(screen.queryByRole('tab', { name: SANDBOX_TAB.TERMINAL })).not.toBeInTheDocument();
    });

    it('falls back when a kept link asks for a terminal that is gone', async () => {
      await renderDetails('nemoclaw-sandbox', { tab: SANDBOX_TAB.TERMINAL });

      expect(activeTab()).toBe(SANDBOX_TAB.OVERVIEW);
      expect(screen.queryByTestId('terminal-tab')).not.toBeInTheDocument();
    });
  });

  describe('the Overview tab', () => {
    it('summarises the spec', async () => {
      await renderDetails('hello-world');

      expect(screen.getByText(TEST_NAMESPACE)).toBeInTheDocument();
      expect(screen.getByText('gvisor')).toBeInTheDocument();
      expect(screen.getByText('cpu: 2, memory: 4Gi')).toBeInTheDocument();
      expect(screen.getByText('ghcr.io/openclaw/openclaw:2026.3.23')).toBeInTheDocument();
      expect(
        screen.getByText(`hello-world.${TEST_NAMESPACE}.svc.cluster.local`),
      ).toBeInTheDocument();
    });

    it('names the operating mode the lifecycle actions write', async () => {
      await renderDetails('openclaw-agent');

      expect(screen.getByText('Suspended', { selector: 'dd *' })).toBeInTheDocument();
    });

    it('spells out why a blocked sandbox cannot start', async () => {
      await renderDetails('nemoclaw-sandbox');

      expect(screen.getByTestId('sandbox-status')).toHaveTextContent(SandboxPhase.BLOCKED);
      const alert = screen.getByTestId('error-alert');
      expect(alert).toHaveTextContent('This sandbox cannot start');
      // The verdict the scheduler wrote, not the Ready condition's
      // 'the pod is not up yet', which explains nothing.
      expect(alert).toHaveTextContent('0/1 nodes are available');
      expect(alert).toHaveTextContent('Reason: Unschedulable');
    });

    it('does not blame the browser for what the controller reported', async () => {
      await renderDetails('nemoclaw-sandbox');

      // The condition is the controller's verdict on the sandbox, not the
      // outcome of a request, so the transport advice must not be appended.
      expect(screen.getByTestId('error-alert')).not.toHaveTextContent(
        'could not be reached from the browser',
      );
    });
  });

  describe('the AI tools on the Overview tab', () => {
    /** Creates a sandbox already running an agent and opens its Overview tab. */
    async function renderWithAgent(): Promise<MockSandboxClient> {
      const client = testClient();
      await client.createSandbox(TEST_NAMESPACE, {
        metadata: { name: 'with-agent', annotations: { [AI_PROVIDERS_ANNOTATION]: 'anthropic' } },
        spec: { podTemplate: { spec: { containers: [{ name: 'agent', image: 'busybox' }] } } },
      } as Sandbox);
      await renderDetails('with-agent', { client, preloadedState: WITH_CATALOG });
      return client;
    }

    it('names the agent the sandbox is running', async () => {
      await renderWithAgent();

      expect(screen.getByTestId('ai-tool-selector')).toHaveTextContent('Anthropic');
    });

    it('says None for a sandbox that runs none', async () => {
      await renderDetails('hello-world', { preloadedState: WITH_CATALOG });

      expect(screen.getByTestId('ai-tool-selector')).toHaveTextContent('None');
    });

    it('patches the sandbox when the selection is saved', async () => {
      const client = await renderWithAgent();
      const patchSpy = jest.spyOn(client, 'patchSandbox');

      await userEvent.click(screen.getByTestId('ai-tool-edit-toggle'));
      await userEvent.click(screen.getByRole('checkbox', { name: /Anthropic/i }));
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(patchSpy).toHaveBeenCalled());
      const [, , patch] = patchSpy.mock.calls[0];
      // Deselecting has to remove the annotations, which a merge patch only
      // does with an explicit null.
      expect(patch.metadata?.annotations?.[AI_PROVIDERS_ANNOTATION]).toBeNull();
    });

    it('sends nothing when the modal is dismissed', async () => {
      const client = await renderWithAgent();
      const patchSpy = jest.spyOn(client, 'patchSandbox');

      await userEvent.click(screen.getByTestId('ai-tool-edit-toggle'));
      await userEvent.click(screen.getByRole('checkbox', { name: /Anthropic/i }));
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(patchSpy).not.toHaveBeenCalled();
    });
  });

  describe('the Manifest tab', () => {
    const MANIFEST = [
      'apiVersion: agents.x-k8s.io/v1beta1',
      'kind: Sandbox',
      'metadata:',
      '  name: from-sample',
    ].join('\n');

    /** Opens the Manifest tab of a sandbox created with the manifest kept on it. */
    async function renderManifestTab(manifest?: string) {
      const client = testClient();
      await client.createSandbox(TEST_NAMESPACE, {
        metadata: {
          name: 'from-sample',
          annotations: manifest === undefined ? {} : { [ORIGINAL_MANIFEST_ANNOTATION]: manifest },
        },
        spec: { podTemplate: { spec: { containers: [{ name: 'agent', image: 'busybox' }] } } },
      } as Sandbox);
      return renderDetails('from-sample', { client, tab: SANDBOX_TAB.MANIFEST });
    }

    it('shows the manifest the sandbox was created from', async () => {
      await renderManifestTab(MANIFEST);

      const manifest = screen.getByTestId('sandbox-manifest');
      expect(manifest).toBeVisible();
      expect(manifest).toHaveTextContent('kind: Sandbox');
      // The published YAML, not the live object the controller has since
      // defaulted and reconciled.
      expect(manifest).not.toHaveTextContent('operatingMode');
    });

    it('names the download after the sandbox', async () => {
      await renderManifestTab(MANIFEST);

      expect(screen.getByTestId('download-manifest-button')).toHaveAttribute(
        'download',
        'from-sample.sandbox.yaml',
      );
    });

    it('lifts the manifest over the page when expanded, and puts it back', async () => {
      await renderManifestTab(MANIFEST);
      const tab = screen.getByTestId('manifest-tab');
      expect(tab).not.toHaveClass('manifestTabExpanded');

      await userEvent.click(screen.getByTestId('expand-manifest-button'));

      // identity-obj-proxy maps a CSS module key to its own name.
      expect(tab).toHaveClass('manifestTabExpanded');
      expect(screen.getByTestId('manifest-viewer-is-expanded')).toHaveTextContent('true');

      await userEvent.click(screen.getByTestId('expand-manifest-button'));

      expect(tab).not.toHaveClass('manifestTabExpanded');
      expect(screen.getByTestId('manifest-viewer-is-expanded')).toHaveTextContent('false');
    });

    it('says so for a sandbox that kept none', async () => {
      await renderManifestTab();

      expect(screen.getByTestId('manifest-tab')).toHaveTextContent(
        'Manifest content is not available',
      );
      expect(screen.queryByTestId('sandbox-manifest')).toBeNull();
    });
  });

  describe('the Conditions tab', () => {
    it('renders the conditions reported by the controller', async () => {
      await renderDetails('hello-world', { tab: SANDBOX_TAB.CONDITIONS });

      expect(screen.getByTestId('conditions-tab')).toBeVisible();
      expect(screen.getByTestId('conditions-table')).toHaveTextContent('DependenciesReady');
    });

    it('keeps the conditions off the Overview tab', async () => {
      await renderDetails('hello-world');

      // The table stays mounted in its own panel; only the panel is hidden.
      expect(screen.getByTestId('conditions-tab')).not.toBeVisible();
    });
  });

  describe('the Events tab', () => {
    it('renders the events of the sandbox', async () => {
      await renderDetails('hello-world', { tab: SANDBOX_TAB.EVENTS });

      expect(screen.getByTestId('events-timeline')).toHaveTextContent('Scheduled');
    });

    it('puts the most recent event at the top of the timeline', async () => {
      await renderDetails('hello-world', { tab: SANDBOX_TAB.EVENTS });

      // The mock schedules the pod first and pulls the image a minute later.
      expect(screen.getAllByTestId('event-reason').map(element => element.textContent)).toEqual([
        'Pulled',
        'Scheduled',
      ]);
    });

    it('says the events could not be listed, rather than looking empty', async () => {
      const client = testClient();
      jest.spyOn(client, 'listEvents').mockRejectedValue(new SandboxClientError(403, 'Forbidden.'));
      await renderDetails('hello-world', { client, tab: SANDBOX_TAB.EVENTS });

      // The sandbox itself is still on the page; only the events pane reports.
      expect(screen.getByRole('heading', { level: 1, name: 'hello-world' })).toBeInTheDocument();
      expect(await screen.findByTestId('error-alert')).toHaveTextContent(/permission|Forbidden/i);
      expect(screen.getByTestId('no-events')).toHaveTextContent('could not be listed');
    });

    /** Runs the body with the interval under the test's control. */
    async function withFakeClock(body: () => Promise<void>): Promise<void> {
      jest.useFakeTimers();
      try {
        await body();
      } finally {
        jest.useRealTimers();
      }
    }

    it('re-reads the events while the tab is open, as pod events do not move the sandbox', async () => {
      await withFakeClock(async () => {
        const client = testClient();
        const listSpy = jest.spyOn(client, 'listEvents');
        await renderDetails('hello-world', { client, tab: SANDBOX_TAB.EVENTS });
        const onOpen = listSpy.mock.calls.length;

        await act(async () => {
          jest.advanceTimersByTime(EVENTS_REFRESH_INTERVAL_MS * 2);
        });

        expect(listSpy.mock.calls.length).toBeGreaterThan(onOpen);
      });
    });

    it('does not re-read while another tab is the one on screen', async () => {
      await withFakeClock(async () => {
        const client = testClient();
        const listSpy = jest.spyOn(client, 'listEvents');
        await renderDetails('hello-world', { client, tab: SANDBOX_TAB.OVERVIEW });
        const onOpen = listSpy.mock.calls.length;

        await act(async () => {
          jest.advanceTimersByTime(EVENTS_REFRESH_INTERVAL_MS * 2);
        });

        expect(listSpy.mock.calls.length).toBe(onOpen);
      });
    });
  });

  describe('lifecycle actions', () => {
    it('offers only the actions the phase allows', async () => {
      await renderDetails('hello-world');

      expect(screen.getByTestId('action-suspend')).toBeInTheDocument();
      expect(screen.queryByTestId('action-resume')).not.toBeInTheDocument();
    });

    it('reflects the phase the watch reports back', async () => {
      await renderDetails('hello-world');

      await userEvent.click(screen.getByTestId('action-suspend'));

      await waitFor(() =>
        expect(screen.getByTestId('sandbox-status')).toHaveTextContent(SandboxPhase.SUSPENDED),
      );
      expect(await screen.findByTestId('action-resume')).toBeInTheDocument();
    });

    it('reports a failed action', async () => {
      const client = testClient();
      jest
        .spyOn(client, 'patchSandbox')
        .mockRejectedValue(new SandboxClientError(403, 'Forbidden.'));
      await renderDetails('hello-world', { client });

      await userEvent.click(screen.getByTestId('action-suspend'));

      expect(await screen.findByTestId('error-alert')).toHaveTextContent('do not have permission');
    });

    it('deletes after confirmation and returns to the list', async () => {
      const client = testClient();
      const deleteSpy = jest.spyOn(client, 'deleteSandbox');
      await renderDetails('hello-world', { client });

      await userEvent.click(screen.getByTestId('delete-button'));
      await userEvent.click(screen.getByTestId('confirmation-checkbox'));
      await userEvent.click(screen.getByTestId('delete-sandbox-button'));

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/sandboxes'));
      expect(deleteSpy).toHaveBeenCalledWith(TEST_NAMESPACE, 'hello-world');
    });
  });

  it('offers a way back when the sandbox does not exist', async () => {
    currentName = 'missing';
    renderInApp(<SandboxDetails />, { route: '/sandboxes/missing' });

    expect(await screen.findByText('Sandbox unavailable')).toBeInTheDocument();
    expect(screen.getByTestId('error-alert')).toHaveTextContent('not found');
    expect(screen.getByRole('link', { name: /back to the sandbox list/i })).toHaveAttribute(
      'href',
      '/sandboxes',
    );
  });
});
