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

import { GettingStarted } from '@/pages/GettingStarted';
import { AiProviderDefinition, AiToolDefinition, EMPTY_CATALOG } from '@/services/catalog';
import {
  AI_PROVIDERS_ANNOTATION,
  AI_VERSIONS_ANNOTATION,
  ORIGINAL_MANIFEST_ANNOTATION,
} from '@/services/sandboxFactory';
import { SandboxClientError } from '@/services/types';
import { unloadedState as catalogUnloadedState } from '@/store/Catalog/reducer';
import { renderInApp, StoreOptions, TEST_NAMESPACE, testClient, testConfig } from '@/testUtils';

const CLAUDE: AiToolDefinition = {
  providerId: 'anthropic',
  tag: 'latest',
  name: 'Claude Code',
  url: '',
  binary: 'claude',
  pattern: 'init',
  injectorImage: 'quay.io/example/claude-code:latest',
  envVarName: 'ANTHROPIC_API_KEY',
};

const GEMINI: AiToolDefinition = {
  providerId: 'google/gemini',
  tag: 'latest',
  name: 'Gemini CLI',
  url: '',
  binary: 'gemini',
  pattern: 'init',
  injectorImage: 'quay.io/example/gemini-cli:latest',
  envVarName: 'GEMINI_API_KEY',
};

const ANTHROPIC: AiProviderDefinition = {
  id: 'anthropic',
  name: 'Anthropic',
  publisher: 'Anthropic',
};

const GOOGLE: AiProviderDefinition = {
  id: 'google/gemini',
  name: 'Google',
  publisher: 'Google',
};

/** Store that already knows the AI registry of the cluster. */
function withCatalog(defaultAiProviders: string[] = []): StoreOptions['preloadedState'] {
  return {
    catalog: {
      ...catalogUnloadedState,
      isLoaded: true,
      catalog: {
        ...EMPTY_CATALOG,
        aiTools: [CLAUDE, GEMINI],
        aiProviders: [ANTHROPIC, GOOGLE],
        defaultAiProviders,
      },
    },
  };
}

const WITH_CATALOG = withCatalog();

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const INDEX = [
  {
    id: 'hello-world',
    displayName: 'Universal Developer Agent',
    description: 'The smallest possible Agent Space.',
    tags: ['Basic'],
    icon: '/images/sandbox.svg',
    source: {
      url: 'https://github.com/kubernetes-sigs/agent-sandbox',
      ref: 'main',
      path: 'examples/hello-world-sandbox/hello-world.yaml',
    },
    manifest: { filename: 'hello-world.yaml' },
  },
  {
    id: 'jupyterlab',
    displayName: 'JupyterLab',
    description: 'A notebook server in an agent space.',
    tags: [],
    notes: 'Needs a persistent volume.',
    manifest: { filename: 'jupyterlab.yaml' },
  },
];

const MANIFEST = [
  'apiVersion: agents.x-k8s.io/v1beta1',
  'kind: Sandbox',
  'metadata:',
  '  name: sample-from-upstream',
  '  namespace: upstream-ns',
  'spec:',
  '  podTemplate:',
  '    spec:',
  '      containers:',
  '        - name: agent',
  '          image: busybox',
].join('\n');

/** Serves the samples index and, for any .yaml, the sample manifest. */
function stubSampleRegistry(): jest.Mock {
  const fetchMock = jest.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('.json')) {
      return Promise.resolve({ ok: true, json: async () => INDEX });
    }
    return Promise.resolve({ ok: true, text: async () => MANIFEST });
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('GettingStarted', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockNavigate.mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('says which application the page belongs to', async () => {
    stubSampleRegistry();
    renderInApp(<GettingStarted />);

    await screen.findByTestId('sample-hello-world');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Agent Space/Getting Started',
    );
  });

  it('renders one card per sample', async () => {
    stubSampleRegistry();
    renderInApp(<GettingStarted />);

    expect(await screen.findByTestId('sample-hello-world')).toHaveTextContent(
      'Universal Developer Agent',
    );
    expect(screen.getByTestId('sample-hello-world')).toHaveTextContent(
      'The smallest possible Agent Space.',
    );
    expect(screen.getByTestId('sample-jupyterlab')).toHaveTextContent('Needs a persistent volume.');
  });

  it('wears the same card treatment as the dashboard sample gallery', async () => {
    stubSampleRegistry();
    renderInApp(<GettingStarted />);

    const card = await screen.findByTestId('sample-hello-world');

    // identity-obj-proxy maps a CSS module key to its own name.
    expect(card).toHaveClass('sampleCard');
    expect(card.querySelector('.pf-v6-c-panel')).toBeNull();
    // Tags read as badges in the title, not as labels in the body.
    expect(screen.getAllByText('Basic')[0]).toHaveClass('pf-v6-c-badge');
  });

  it('shows the icon the registry ships for a sample', async () => {
    stubSampleRegistry();
    renderInApp(<GettingStarted />);

    expect(await screen.findByTestId('sample-icon-hello-world')).toHaveAttribute(
      'src',
      './registry/images/sandbox.svg',
    );
  });

  it('falls back to a generic icon when the index names none', async () => {
    stubSampleRegistry();
    renderInApp(<GettingStarted />);

    await screen.findByTestId('sample-hello-world');

    // The JupyterLab entry carries no icon.
    expect(screen.getByTestId('default-icon-jupyterlab')).toBeInTheDocument();
  });

  it('groups the samples under a heading that says what a click does', async () => {
    stubSampleRegistry();
    renderInApp(<GettingStarted />);

    await screen.findByTestId('sample-hello-world');

    expect(screen.getByRole('heading', { name: 'Select a Sample' })).toBeInTheDocument();
    expect(screen.getByText(/Select a sample to create/)).toBeInTheDocument();
  });

  it('shows the manifest served from the registry, not a link to upstream', async () => {
    const fetchMock = stubSampleRegistry();
    renderInApp(<GettingStarted />);

    await userEvent.click(await screen.findByTestId('view-manifest-hello-world'));

    const modal = await screen.findByTestId('sample-manifest-modal');
    expect(modal).toHaveTextContent('Universal Developer Agent manifest');
    expect(screen.getByTestId('sandbox-manifest')).toHaveTextContent('name: sample-from-upstream');
    expect(fetchMock).toHaveBeenCalledWith(
      './registry/sandbox/hello-world.yaml',
      expect.anything(),
    );
    // No card links off to the upstream repository any more.
    expect(screen.getByTestId('sample-hello-world').querySelector('a')).toBeNull();
  });

  it('does not create a sandbox when the manifest is opened from a card', async () => {
    stubSampleRegistry();
    const client = testClient();
    const createSpy = jest.spyOn(client, 'createSandbox');
    renderInApp(<GettingStarted />, { client });

    await userEvent.click(await screen.findByTestId('view-manifest-hello-world'));

    await screen.findByTestId('sample-manifest-modal');
    expect(createSpy).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('closes the manifest preview', async () => {
    stubSampleRegistry();
    renderInApp(<GettingStarted />);

    await userEvent.click(await screen.findByTestId('view-manifest-hello-world'));
    await screen.findByTestId('sample-manifest-modal');
    await userEvent.click(screen.getByTestId('close-manifest-button'));

    await waitFor(() =>
      expect(screen.queryByTestId('sample-manifest-modal')).not.toBeInTheDocument(),
    );
  });

  it('reports a manifest the registry cannot serve', async () => {
    global.fetch = jest.fn((input: RequestInfo | URL) =>
      String(input).endsWith('.json')
        ? Promise.resolve({ ok: true, json: async () => INDEX })
        : Promise.resolve({ ok: false, status: 404 }),
    ) as unknown as typeof fetch;
    renderInApp(<GettingStarted />);

    await userEvent.click(await screen.findByTestId('view-manifest-hello-world'));

    expect(await screen.findByTestId('error-alert')).toHaveTextContent('samples:prepare');
  });

  it('creates the sample in the user namespace and opens its details page', async () => {
    stubSampleRegistry();
    const client = testClient();
    const createSpy = jest.spyOn(client, 'createSandbox');
    renderInApp(<GettingStarted />, { client });

    await userEvent.click(await screen.findByTestId('sample-hello-world'));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/sandboxes/sample-from-upstream?tab=Events'),
    );
    expect(createSpy).toHaveBeenCalledWith(
      TEST_NAMESPACE,
      expect.objectContaining({
        metadata: expect.objectContaining({ namespace: TEST_NAMESPACE }),
      }),
    );
  });

  it('opens the sandbox a second click would have duplicated', async () => {
    stubSampleRegistry();
    const client = testClient();
    const existing = {
      apiVersion: 'agents.x-k8s.io/v1beta1',
      kind: 'Sandbox',
      metadata: { name: 'sample-from-upstream', namespace: TEST_NAMESPACE },
      spec: { podTemplate: { spec: { containers: [] } } },
    };
    jest
      .spyOn(client, 'createSandbox')
      .mockRejectedValue(
        new SandboxClientError(
          409,
          'sandboxes "sample-from-upstream" already exists',
          'AlreadyExists',
        ),
      );
    const getSpy = jest.spyOn(client, 'getSandbox').mockResolvedValue(existing);
    renderInApp(<GettingStarted />, { client });

    await userEvent.click(await screen.findByTestId('sample-hello-world'));

    // The sample named it, so there is no different name for the user to pick.
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/sandboxes/sample-from-upstream?tab=Events'),
    );
    expect(getSpy).toHaveBeenCalledWith(TEST_NAMESPACE, 'sample-from-upstream');
    expect(screen.queryByTestId('error-alert')).not.toBeInTheDocument();
  });

  it('reports a failed creation without leaving the gallery', async () => {
    stubSampleRegistry();
    const client = testClient();
    jest
      .spyOn(client, 'createSandbox')
      .mockRejectedValue(new SandboxClientError(403, 'Forbidden.'));
    renderInApp(<GettingStarted />, { client });

    await userEvent.click(await screen.findByTestId('sample-hello-world'));

    expect(await screen.findByTestId('error-alert')).toHaveTextContent('do not have permission');
    expect(screen.getByTestId('sample-hello-world')).toBeInTheDocument();
  });

  it('lets the user dismiss a failed creation and try again', async () => {
    stubSampleRegistry();
    const client = testClient();
    jest
      .spyOn(client, 'createSandbox')
      .mockRejectedValue(new SandboxClientError(403, 'Forbidden.'));
    renderInApp(<GettingStarted />, { client });
    await userEvent.click(await screen.findByTestId('sample-hello-world'));
    await screen.findByTestId('error-alert');

    await userEvent.click(screen.getByRole('button', { name: /close/i }));

    await waitFor(() => expect(screen.queryByTestId('error-alert')).not.toBeInTheDocument());
  });

  it('points at the prepare script when a manifest was never downloaded', async () => {
    global.fetch = jest.fn((input: RequestInfo | URL) =>
      String(input).endsWith('.json')
        ? Promise.resolve({ ok: true, json: async () => INDEX })
        : Promise.resolve({ ok: false, status: 404 }),
    ) as unknown as typeof fetch;
    renderInApp(<GettingStarted />);

    await userEvent.click(await screen.findByTestId('sample-hello-world'));

    expect(await screen.findByTestId('error-alert')).toHaveTextContent('samples:prepare');
  });

  it('creates from the keyboard, as the card is not a button', async () => {
    stubSampleRegistry();
    const client = testClient();
    const createSpy = jest.spyOn(client, 'createSandbox');
    renderInApp(<GettingStarted />, { client });

    const card = await screen.findByTestId('sample-hello-world');
    card.focus();
    await userEvent.keyboard('{Enter}');

    await waitFor(() => expect(createSpy).toHaveBeenCalled());
  });

  it('leaves the card alone for keys that are not Enter or Space', async () => {
    stubSampleRegistry();
    const client = testClient();
    const createSpy = jest.spyOn(client, 'createSandbox');
    renderInApp(<GettingStarted />, { client });

    const card = await screen.findByTestId('sample-hello-world');
    card.focus();
    await userEvent.keyboard('{ArrowDown}');

    expect(createSpy).not.toHaveBeenCalled();
  });

  it('tells the user how to populate an empty registry', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => [] }) as unknown as typeof fetch;
    renderInApp(<GettingStarted />);

    expect(await screen.findByText('No samples available')).toBeInTheDocument();
  });

  it('reports an unreachable registry', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch;
    renderInApp(<GettingStarted />);

    expect(await screen.findByTestId('error-alert')).toHaveTextContent(
      'Could not load the samples',
    );
  });

  describe('the AI provider selector', () => {
    /** Opens the second accordion item, where the card gallery lives. */
    async function openGallery(): Promise<void> {
      await userEvent.click(screen.getByRole('button', { name: 'Choose an AI Provider' }));
    }

    it('is left out when the cluster publishes none', async () => {
      stubSampleRegistry();
      renderInApp(<GettingStarted />);

      await screen.findByTestId('sample-hello-world');

      expect(screen.queryByRole('heading', { name: 'AI Provider Selector' })).toBeNull();
    });

    it('opens on the provider the administrator configured', async () => {
      stubSampleRegistry();
      renderInApp(<GettingStarted />, { preloadedState: withCatalog(['google/gemini']) });

      await screen.findByTestId('sample-hello-world');

      expect(screen.getByTestId('default-ai-provider-message')).toHaveTextContent(
        'The default AI provider "Google" configured by your administrator will be used.',
      );
    });

    it('falls back to the first provider when the cluster names no default', async () => {
      stubSampleRegistry();
      renderInApp(<GettingStarted />, { preloadedState: WITH_CATALOG });

      await screen.findByTestId('sample-hello-world');

      expect(screen.getByTestId('default-ai-provider-message')).toHaveTextContent(
        'The default AI provider "Anthropic" configured by your administrator will be used.',
      );
    });

    it('names every default the administrator configured', async () => {
      stubSampleRegistry();
      renderInApp(<GettingStarted />, {
        preloadedState: withCatalog(['anthropic', 'google/gemini']),
      });

      await screen.findByTestId('sample-hello-world');

      expect(screen.getByTestId('default-ai-provider-message')).toHaveTextContent(
        'The default AI providers "Anthropic", "Google" configured by your administrator will be used.',
      );
    });

    it('points at the documentation from the default branch', async () => {
      stubSampleRegistry();
      renderInApp(<GettingStarted />, { preloadedState: WITH_CATALOG });

      await screen.findByTestId('sample-hello-world');

      expect(screen.getByRole('link', { name: 'Learn more about AI providers' })).toHaveAttribute(
        'href',
        expect.stringContaining('eclipse.dev/che/docs'),
      );
    });

    it('points at the dashboard page where the API keys are managed', async () => {
      stubSampleRegistry();
      renderInApp(<GettingStarted />, {
        config: testConfig({ dashboardUrl: 'https://che.example.com/dashboard/#/workspaces' }),
        preloadedState: WITH_CATALOG,
      });

      await screen.findByTestId('sample-hello-world');
      await openGallery();

      expect(screen.getByTestId('manage-keys-link')).toHaveAttribute(
        'href',
        'https://che.example.com/dashboard/#/user-preferences?tab=AiProviderKeys',
      );
    });

    it('creates the sample with the default provider installed', async () => {
      stubSampleRegistry();
      const client = testClient();
      const createSpy = jest.spyOn(client, 'createSandbox');
      renderInApp(<GettingStarted />, { client, preloadedState: withCatalog(['anthropic']) });

      await userEvent.click(await screen.findByTestId('sample-hello-world'));

      await waitFor(() => expect(createSpy).toHaveBeenCalled());
      const created = createSpy.mock.calls[0][1];
      expect(created.metadata.annotations).toEqual({
        [AI_PROVIDERS_ANNOTATION]: ANTHROPIC.id,
        [AI_VERSIONS_ANNOTATION]: 'anthropic=latest',
        [ORIGINAL_MANIFEST_ANNOTATION]: MANIFEST,
      });
      expect(created.spec.podTemplate.spec.initContainers).toHaveLength(1);
    });

    it('creates the sample as published once the provider is unpicked', async () => {
      stubSampleRegistry();
      const client = testClient();
      const createSpy = jest.spyOn(client, 'createSandbox');
      renderInApp(<GettingStarted />, { client, preloadedState: withCatalog(['anthropic']) });
      await screen.findByTestId('sample-hello-world');

      await openGallery();
      await userEvent.click(screen.getByTestId('ai-provider-card-anthropic'));

      await userEvent.click(screen.getByTestId('sample-hello-world'));

      await waitFor(() => expect(createSpy).toHaveBeenCalled());
      // Only the manifest it came from: no agent is left to inject.
      expect(createSpy.mock.calls[0][1].metadata.annotations).toEqual({
        [ORIGINAL_MANIFEST_ANNOTATION]: MANIFEST,
      });
    });

    it('applies a provider picked from the gallery', async () => {
      stubSampleRegistry();
      const client = testClient();
      const createSpy = jest.spyOn(client, 'createSandbox');
      renderInApp(<GettingStarted />, { client, preloadedState: withCatalog(['anthropic']) });
      await screen.findByTestId('sample-hello-world');

      await openGallery();
      await userEvent.click(screen.getByTestId('ai-provider-card-google-gemini'));

      await userEvent.click(screen.getByTestId('sample-hello-world'));

      await waitFor(() => expect(createSpy).toHaveBeenCalled());
      const created = createSpy.mock.calls[0][1];
      expect(created.metadata.annotations?.[AI_PROVIDERS_ANNOTATION]).toBe(
        'anthropic,google/gemini',
      );
      expect(created.spec.podTemplate.spec.initContainers).toHaveLength(2);
    });

    it('goes back to the default once the default branch is reopened', async () => {
      stubSampleRegistry();
      const client = testClient();
      const createSpy = jest.spyOn(client, 'createSandbox');
      renderInApp(<GettingStarted />, { client, preloadedState: withCatalog(['anthropic']) });
      await screen.findByTestId('sample-hello-world');

      await openGallery();
      await userEvent.click(screen.getByTestId('ai-provider-card-google-gemini'));
      await userEvent.click(screen.getByRole('button', { name: 'Use a Default AI Provider' }));

      await userEvent.click(screen.getByTestId('sample-hello-world'));

      await waitFor(() => expect(createSpy).toHaveBeenCalled());
      expect(createSpy.mock.calls[0][1].metadata.annotations?.[AI_PROVIDERS_ANNOTATION]).toBe(
        'anthropic',
      );
    });

    it('keeps the published YAML, not the manifest it ends up sending', async () => {
      stubSampleRegistry();
      const client = testClient();
      const createSpy = jest.spyOn(client, 'createSandbox');
      renderInApp(<GettingStarted />, { client, preloadedState: WITH_CATALOG });

      await userEvent.click(await screen.findByTestId('sample-hello-world'));

      await waitFor(() => expect(createSpy).toHaveBeenCalled());
      const manifest =
        createSpy.mock.calls[0][1].metadata.annotations?.[ORIGINAL_MANIFEST_ANNOTATION];
      expect(manifest).toContain('namespace: upstream-ns');
    });
  });

  describe('the storage switch', () => {
    it('sits with the samples, as a card click is the whole of the create', async () => {
      stubSampleRegistry();
      renderInApp(<GettingStarted />, { preloadedState: WITH_CATALOG });

      const header = (await screen.findByRole('heading', { name: 'Select a Sample' })).closest(
        '.pf-v6-c-panel__header',
      ) as HTMLElement;

      expect(within(header).getByRole('switch', { name: /Temporary Storage/ })).not.toBeChecked();
    });

    it('creates the sample with a claim of its own while it is off', async () => {
      stubSampleRegistry();
      const client = testClient();
      const createSpy = jest.spyOn(client, 'createSandbox');
      renderInApp(<GettingStarted />, { client, preloadedState: WITH_CATALOG });

      await userEvent.click(await screen.findByTestId('sample-hello-world'));

      await waitFor(() => expect(createSpy).toHaveBeenCalled());
      const podSpec = createSpy.mock.calls[0][1].spec.podTemplate.spec;
      expect(podSpec.volumes).toContainEqual({
        name: 'sandbox-storage',
        persistentVolumeClaim: { claimName: 'sandbox-sample-from-upstream' },
      });
      expect(podSpec.containers[0].volumeMounts).toContainEqual({
        name: 'sandbox-storage',
        mountPath: '/workspace',
      });
    });

    it('creates the sample on an emptyDir once it is turned on', async () => {
      stubSampleRegistry();
      const client = testClient();
      const createSpy = jest.spyOn(client, 'createSandbox');
      renderInApp(<GettingStarted />, { client, preloadedState: WITH_CATALOG });
      await screen.findByTestId('sample-hello-world');

      await userEvent.click(screen.getByRole('switch', { name: /Temporary Storage/ }));
      await userEvent.click(screen.getByTestId('sample-hello-world'));

      await waitFor(() => expect(createSpy).toHaveBeenCalled());
      expect(createSpy.mock.calls[0][1].spec.podTemplate.spec.volumes).toContainEqual({
        name: 'sandbox-storage',
        emptyDir: { sizeLimit: '5Gi' },
      });
    });
  });
});
