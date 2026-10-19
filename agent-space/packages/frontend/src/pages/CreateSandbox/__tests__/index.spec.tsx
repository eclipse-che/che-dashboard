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

import { CreateSandbox } from '@/pages/CreateSandbox';
import { AiProviderDefinition, AiToolDefinition, EMPTY_CATALOG } from '@/services/catalog';
import { getSandboxOriginalManifest } from '@/services/sandbox';
import { SandboxClientError } from '@/services/types';
import { unloadedState as catalogUnloadedState } from '@/store/Catalog/reducer';
import { unloadedState as sandboxesUnloadedState } from '@/store/Sandboxes/reducer';
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

const ANTHROPIC: AiProviderDefinition = {
  id: 'anthropic',
  name: 'Anthropic',
  publisher: 'Anthropic',
};

/** Store that already knows the AI registry of the cluster. */
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

beforeEach(() => {
  mockNavigate.mockClear();
});

/** Opens the AI tools dropdown and flips the given providers. */
async function changeAiTools(...providerIds: string[]): Promise<void> {
  await userEvent.click(screen.getByTestId('ai-tool-dropdown-toggle'));
  const menu = within(screen.getByTestId('ai-tool-dropdown'));
  for (const providerId of providerIds) {
    await userEvent.click(menu.getByRole('checkbox', { name: new RegExp(providerId, 'i') }));
  }
  await userEvent.click(screen.getByTestId('ai-tool-dropdown-toggle'));
}

describe('CreateSandbox', () => {
  it('says which application the page belongs to', () => {
    renderInApp(<CreateSandbox />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Agent Space/Create Sandbox',
    );
  });

  it('names the namespace the sandbox lands in', () => {
    renderInApp(<CreateSandbox />);

    expect(screen.getByText(TEST_NAMESPACE)).toBeInTheDocument();
  });

  it('keeps Create disabled until the form is valid', async () => {
    renderInApp(<CreateSandbox />);

    expect(screen.getByTestId('submit-button')).toBeDisabled();

    await userEvent.type(screen.getByTestId('sandbox-name'), 'my-agent');

    expect(screen.getByTestId('submit-button')).toBeEnabled();
  });

  it('explains an invalid name only once the field has been touched', async () => {
    renderInApp(<CreateSandbox />);

    expect(screen.queryByText(/lowercase letters, digits and dashes/i)).toBeInTheDocument();

    await userEvent.type(screen.getByTestId('sandbox-name'), 'My_Agent');

    expect(await screen.findByText(/lowercase letters/i)).toBeInTheDocument();
    expect(screen.getByTestId('submit-button')).toBeDisabled();
  });

  it('rejects an invalid memory quantity', async () => {
    renderInApp(<CreateSandbox />);
    await userEvent.type(screen.getByTestId('sandbox-name'), 'my-agent');

    await userEvent.clear(screen.getByTestId('sandbox-memory'));
    await userEvent.type(screen.getByTestId('sandbox-memory'), '2 GB');

    expect(screen.getByTestId('submit-button')).toBeDisabled();
  });

  it('previews the manifest it is about to submit', async () => {
    renderInApp(<CreateSandbox />);
    await userEvent.type(screen.getByTestId('sandbox-name'), 'my-agent');

    const preview = screen.getByTestId('manifest-preview');
    expect(preview).toHaveTextContent('kind: Sandbox');
    expect(preview).toHaveTextContent('name: my-agent');
    expect(preview).toHaveTextContent(`namespace: ${TEST_NAMESPACE}`);
  });

  it('offers a command that keeps the sandbox from finishing at once', async () => {
    renderInApp(<CreateSandbox />);
    await userEvent.type(screen.getByTestId('sandbox-name'), 'my-agent');

    expect(screen.getByTestId('sandbox-command')).toHaveValue('sleep infinity');
    expect(screen.getByTestId('manifest-preview')).toHaveTextContent('sleep infinity');
  });

  it('keeps the preview in step with the command', async () => {
    renderInApp(<CreateSandbox />);
    await userEvent.type(screen.getByTestId('sandbox-name'), 'my-agent');

    await userEvent.clear(screen.getByTestId('sandbox-command'));
    await userEvent.type(screen.getByTestId('sandbox-command'), 'serve');

    expect(screen.getByTestId('manifest-preview')).toHaveTextContent('serve');
  });

  it('keeps the preview in step with the runtime class', async () => {
    renderInApp(<CreateSandbox />);
    await userEvent.type(screen.getByTestId('sandbox-name'), 'my-agent');

    await userEvent.selectOptions(screen.getByTestId('sandbox-runtime-class'), 'kata-qemu');

    expect(screen.getByTestId('manifest-preview')).toHaveTextContent('runtimeClassName: kata-qemu');
  });

  it('creates the sandbox and opens its details page on the Events tab', async () => {
    const client = testClient();
    const createSpy = jest.spyOn(client, 'createSandbox');
    renderInApp(<CreateSandbox />, { client });

    await userEvent.type(screen.getByTestId('sandbox-name'), 'my-agent');
    await userEvent.click(screen.getByTestId('submit-button'));

    // Events are what a brand new sandbox has to show.
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/sandboxes/my-agent?tab=Events'),
    );
    const [namespace, desired] = createSpy.mock.calls[0];
    expect(namespace).toBe(TEST_NAMESPACE);
    expect(desired.metadata.name).toBe('my-agent');
    expect(desired.metadata.namespace).toBe(TEST_NAMESPACE);
  });

  it('keeps the manifest it previewed, so the Manifest tab shows the same thing', async () => {
    const client = testClient();
    const createSpy = jest.spyOn(client, 'createSandbox');
    renderInApp(<CreateSandbox />, { client });

    await userEvent.type(screen.getByTestId('sandbox-name'), 'my-agent');
    const preview = screen.getByTestId('manifest-preview').textContent;
    await userEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => expect(createSpy).toHaveBeenCalled());
    expect(getSandboxOriginalManifest(createSpy.mock.calls[0][1])).toBe(preview);
  });

  it('reports a name that is already taken', async () => {
    renderInApp(<CreateSandbox />);

    await userEvent.type(screen.getByTestId('sandbox-name'), 'hello-world');
    await userEvent.click(screen.getByTestId('submit-button'));

    expect(await screen.findByTestId('error-alert')).toHaveTextContent('Choose a different name');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('lets the user dismiss the error and try again', async () => {
    const client = testClient();
    jest
      .spyOn(client, 'createSandbox')
      .mockRejectedValueOnce(new SandboxClientError(403, 'Forbidden.'));
    renderInApp(<CreateSandbox />, { client });

    await userEvent.type(screen.getByTestId('sandbox-name'), 'my-agent');
    await userEvent.click(screen.getByTestId('submit-button'));

    await userEvent.click(await screen.findByRole('button', { name: /close/i }));

    expect(screen.queryByTestId('error-alert')).not.toBeInTheDocument();
  });

  it('goes back to the list on Cancel', async () => {
    renderInApp(<CreateSandbox />);

    await userEvent.click(screen.getByTestId('cancel-button'));

    expect(mockNavigate).toHaveBeenCalledWith('/sandboxes');
  });

  describe('the AI tools', () => {
    it('are not offered when the registry publishes none', () => {
      renderInApp(<CreateSandbox />);

      expect(screen.queryByTestId('ai-tool-dropdown')).toBeNull();
    });

    it('come after the resource limits, with only the storage below them', () => {
      renderInApp(<CreateSandbox />, { preloadedState: WITH_CATALOG });

      const labels = screen
        .getAllByText(
          /^(Name|Container image|Command|Runtime class|CPU limit|Memory limit|AI tools|Storage Type)$/,
        )
        .map(label => label.textContent);

      expect(labels.slice(-2)).toEqual(['AI tools', 'Storage Type']);
    });

    it('start with none selected, so a sandbox can run without one', () => {
      renderInApp(<CreateSandbox />, { preloadedState: WITH_CATALOG });

      expect(screen.getByTestId('ai-tool-dropdown-toggle')).toHaveTextContent('None');
    });

    it('are picked from a dropdown, like the rest of the form', async () => {
      renderInApp(<CreateSandbox />, { preloadedState: WITH_CATALOG });

      const toggle = screen.getByTestId('ai-tool-dropdown-toggle');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');

      await userEvent.click(toggle);

      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('checkbox', { name: /Anthropic/i })).toBeInTheDocument();
    });

    it('stay open while more than one is picked', async () => {
      renderInApp(<CreateSandbox />, { preloadedState: WITH_CATALOG });

      await userEvent.click(screen.getByTestId('ai-tool-dropdown-toggle'));
      await userEvent.click(screen.getByRole('checkbox', { name: /Anthropic/i }));

      // A multi-select that closed on the first pick would make the second
      // one cost another open.
      expect(screen.getByRole('checkbox', { name: /Anthropic/i })).toBeChecked();
    });

    it('install the selected agent into the sandbox', async () => {
      renderInApp(<CreateSandbox />, { preloadedState: WITH_CATALOG });
      await userEvent.type(screen.getByTestId('sandbox-name'), 'my-agent');

      await changeAiTools('Anthropic');

      expect(screen.getByTestId('ai-tool-dropdown-toggle')).toHaveTextContent('Anthropic');
      const preview = screen.getByTestId('manifest-preview');
      expect(preview).toHaveTextContent('claude-code-injector');
      expect(preview).toHaveTextContent('che.eclipse.org/ai-providers: anthropic');
      expect(preview).toHaveTextContent('ai-provider-anthropic-api-key');
    });

    it('are dropped again when the agent is unselected', async () => {
      renderInApp(<CreateSandbox />, { preloadedState: WITH_CATALOG });
      await userEvent.type(screen.getByTestId('sandbox-name'), 'my-agent');

      await changeAiTools('Anthropic');
      await changeAiTools('Anthropic');

      expect(screen.getByTestId('ai-tool-dropdown-toggle')).toHaveTextContent('None');
      expect(screen.getByTestId('manifest-preview')).not.toHaveTextContent('ai-providers');
    });

    it('apply as soon as one is picked, with nothing to confirm', async () => {
      renderInApp(<CreateSandbox />, { preloadedState: WITH_CATALOG });
      await userEvent.type(screen.getByTestId('sandbox-name'), 'my-agent');

      await userEvent.click(screen.getByTestId('ai-tool-dropdown-toggle'));
      await userEvent.click(screen.getByRole('checkbox', { name: /Anthropic/i }));

      // The form is still being filled in; there is nothing to save against
      // yet, so the preview follows the pick the way it follows a keystroke.
      expect(screen.getByTestId('manifest-preview')).toHaveTextContent(
        'che.eclipse.org/ai-providers: anthropic',
      );
    });

    it('can be chosen with the keyboard', async () => {
      renderInApp(<CreateSandbox />, { preloadedState: WITH_CATALOG });

      await userEvent.click(screen.getByTestId('ai-tool-dropdown-toggle'));
      screen.getByRole('checkbox', { name: /Anthropic/i }).focus();
      await userEvent.keyboard('{Enter}');

      expect(screen.getByTestId('ai-tool-dropdown-toggle')).toHaveTextContent('Anthropic');
    });

    it('cannot be changed while the sandbox is being created', () => {
      renderInApp(<CreateSandbox />, {
        preloadedState: {
          ...WITH_CATALOG,
          sandboxes: { ...sandboxesUnloadedState, pendingName: 'my-agent' },
        },
      });

      expect(screen.getByTestId('ai-tool-dropdown-toggle')).toBeDisabled();
    });

    it('lists the agents and nothing else', async () => {
      renderInApp(<CreateSandbox />, {
        config: testConfig({ dashboardUrl: 'https://che.example.com/dashboard/#/workspaces' }),
        preloadedState: WITH_CATALOG,
      });

      await userEvent.click(screen.getByTestId('ai-tool-dropdown-toggle'));

      expect(screen.queryByRole('link', { name: /Manage API keys/ })).toBeNull();
    });

    it('says how an agent reaches the sandbox, without mentioning keys', () => {
      renderInApp(<CreateSandbox />, { preloadedState: WITH_CATALOG });

      expect(screen.getByText(/installed into the sandbox by an init container/)).toHaveTextContent(
        'Each selected agent is installed into the sandbox by an init container.',
      );
    });
  });

  describe('the storage type', () => {
    it('keeps the work of the sandbox by default', async () => {
      renderInApp(<CreateSandbox />);
      await userEvent.type(screen.getByTestId('sandbox-name'), 'my-agent');

      expect(screen.getByTestId('storage-type')).toHaveValue('per-sandbox');
      expect(screen.getByTestId('manifest-preview')).toHaveTextContent(
        'claimName: sandbox-my-agent',
      );
    });

    it('follows the name, so the claim is the one the backend will make', async () => {
      renderInApp(<CreateSandbox />);
      await userEvent.type(screen.getByTestId('sandbox-name'), 'other-agent');

      expect(screen.getByTestId('manifest-preview')).toHaveTextContent(
        'claimName: sandbox-other-agent',
      );
    });

    it('asks for an emptyDir once ephemeral is picked', async () => {
      renderInApp(<CreateSandbox />);
      await userEvent.type(screen.getByTestId('sandbox-name'), 'my-agent');

      await userEvent.selectOptions(screen.getByTestId('storage-type'), 'ephemeral');

      const preview = screen.getByTestId('manifest-preview');
      expect(preview).toHaveTextContent('emptyDir');
      expect(preview).not.toHaveTextContent('claimName');
    });

    it('says what the picked type means', async () => {
      renderInApp(<CreateSandbox />);

      expect(screen.getByText(/A persistent volume claim is provisioned/)).toBeInTheDocument();

      await userEvent.selectOptions(screen.getByTestId('storage-type'), 'ephemeral');

      expect(screen.getByText(/faster I\/O but may have limited storage/)).toBeInTheDocument();
    });

    it('explains both types from the help button', async () => {
      renderInApp(<CreateSandbox />);

      await userEvent.click(screen.getByTestId('storage-type-info-toggle'));

      expect(screen.getByTestId('storage-type-info-modal')).toBeInTheDocument();
      expect(screen.getByText('Storage Type Info')).toBeInTheDocument();
    });

    it('cannot be changed while the sandbox is being created', () => {
      renderInApp(<CreateSandbox />, {
        preloadedState: { sandboxes: { ...sandboxesUnloadedState, pendingName: 'my-agent' } },
      });

      expect(screen.getByTestId('storage-type')).toBeDisabled();
    });
  });
});
