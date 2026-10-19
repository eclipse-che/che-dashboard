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

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { AiToolSelector, Props } from '@/components/AiToolSelector';
import { AiProviderDefinition, AiToolDefinition } from '@/services/catalog';

const CLAUDE: AiToolDefinition = {
  providerId: 'anthropic',
  tag: 'latest',
  name: 'Claude Code',
  url: '',
  binary: 'claude',
  pattern: 'init',
  injectorImage: 'quay.io/example/claude-code:latest',
};

const CODEX: AiToolDefinition = {
  providerId: 'openai',
  tag: 'latest',
  name: 'Codex',
  url: '',
  binary: 'codex',
  pattern: 'init',
  injectorImage: 'quay.io/example/codex-cli:latest',
};

const PROVIDERS: AiProviderDefinition[] = [
  { id: 'anthropic', name: 'Anthropic', publisher: 'Anthropic' },
  { id: 'openai', name: 'OpenAI', publisher: 'OpenAI' },
];

function renderSelector(props: Partial<Props> = {}) {
  const onChange = jest.fn();
  const result = render(
    <AiToolSelector
      aiTools={[CLAUDE, CODEX]}
      aiProviders={PROVIDERS}
      dashboardUrl="https://che.example.com/dashboard/#/workspaces"
      customization={{ aiProviderIds: [] }}
      onChange={onChange}
      {...props}
    />,
  );
  return { ...result, onChange };
}

describe('AiToolSelector', () => {
  it('renders nothing when the cluster publishes no AI tools', () => {
    renderSelector({ aiTools: [] });

    expect(screen.queryByTestId('ai-tool-selector')).toBeNull();
  });

  it('says None when nothing is installed', () => {
    renderSelector();

    expect(screen.getByTestId('ai-tool-selector')).toHaveTextContent('None');
  });

  it('names every provider that is installed', () => {
    renderSelector({ customization: { aiProviderIds: ['anthropic', 'openai'] } });

    expect(screen.getByTestId('ai-tool-selector')).toHaveTextContent('Anthropic, OpenAI');
  });

  it('falls back to the id of a provider the catalogue no longer publishes', () => {
    renderSelector({ customization: { aiProviderIds: ['retired'] } });

    expect(screen.getByTestId('ai-tool-selector')).toHaveTextContent('retired');
  });

  it('keeps the pencil out of reach while the sandbox may not be changed', () => {
    renderSelector({ isDisabled: true });

    expect(screen.getByTestId('ai-tool-edit-toggle')).toBeDisabled();
  });

  it('spells out why the pencil is out of reach', () => {
    renderSelector({ isDisabled: true, disabledReason: 'Suspend the sandbox first.' });

    expect(screen.getByTestId('ai-tool-disabled-reason')).toHaveTextContent(
      'Suspend the sandbox first.',
    );
    expect(screen.getByTestId('ai-tool-edit-toggle')).toHaveAttribute(
      'title',
      'Suspend the sandbox first.',
    );
  });

  it('keeps a reason it was handed to itself while the pencil still works', () => {
    renderSelector({ disabledReason: 'Suspend the sandbox first.' });

    expect(screen.queryByTestId('ai-tool-disabled-reason')).toBeNull();
    expect(screen.getByTestId('ai-tool-edit-toggle')).toHaveAttribute('title', 'Change AI Tools');
  });

  it('reports the saved selection to its parent and closes', async () => {
    const { onChange } = renderSelector();

    await userEvent.click(screen.getByTestId('ai-tool-edit-toggle'));
    await userEvent.click(screen.getByRole('checkbox', { name: /Anthropic/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onChange).toHaveBeenCalledWith({ aiProviderIds: ['anthropic'], aiVersions: {} });
    expect(screen.queryByTestId('ai-tool-selector-modal')).toBeNull();
  });

  it('reports nothing on Cancel', async () => {
    const { onChange } = renderSelector();

    await userEvent.click(screen.getByTestId('ai-tool-edit-toggle'));
    await userEvent.click(screen.getByRole('checkbox', { name: /Anthropic/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId('ai-tool-selector-modal')).toBeNull();
  });

  it('reopens on what the sandbox carries, not on what was cancelled', async () => {
    renderSelector();

    await userEvent.click(screen.getByTestId('ai-tool-edit-toggle'));
    await userEvent.click(screen.getByRole('checkbox', { name: /Anthropic/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByTestId('ai-tool-edit-toggle'));

    expect(screen.getByRole('checkbox', { name: /Anthropic/ })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('sends the user to the dashboard page that holds the API keys', async () => {
    renderSelector();

    await userEvent.click(screen.getByTestId('ai-tool-edit-toggle'));

    expect(screen.getByRole('link', { name: /Manage API keys/ })).toHaveAttribute(
      'href',
      'https://che.example.com/dashboard/#/user-preferences?tab=AiProviderKeys',
    );
  });
});
