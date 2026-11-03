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

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { AiToolIcon, Props } from '@/components/AiToolIcon';
import { AiProviderDefinition, AiToolDefinition } from '@/services/catalog';

const TOOLS: AiToolDefinition[] = [
  {
    providerId: 'anthropic',
    tag: 'latest',
    name: 'Claude Code',
    url: '',
    binary: 'claude',
    pattern: 'init',
    injectorImage: 'quay.io/example/claude-code:latest',
  },
  {
    providerId: 'openai',
    tag: 'latest',
    name: 'Codex',
    url: '',
    binary: 'codex',
    pattern: 'init',
    injectorImage: 'quay.io/example/codex-cli:latest',
  },
];

const PROVIDERS: AiProviderDefinition[] = [
  { id: 'anthropic', name: 'Anthropic', publisher: 'Anthropic', icon: '/images/anthropic.svg' },
  { id: 'openai', name: 'OpenAI', publisher: 'OpenAI', icon: '/images/openai.svg' },
];

function renderIcon(props: Partial<Props> = {}) {
  return render(
    <AiToolIcon providerIds={['anthropic']} aiTools={TOOLS} aiProviders={PROVIDERS} {...props} />,
  );
}

describe('AiToolIcon', () => {
  it('shows a dash for a sandbox that runs no agent', () => {
    const { container } = renderIcon({ providerIds: [] });

    expect(container).toHaveTextContent('-');
    expect(screen.queryByTestId('ai-tool-icon')).toBeNull();
  });

  it('names the agent when there is only one', () => {
    renderIcon();

    expect(screen.getByTestId('ai-tool-icon')).toHaveTextContent('Claude Code');
    expect(screen.getByAltText('Claude Code')).toHaveAttribute('src', '/images/anthropic.svg');
  });

  it('shows the icons alone when there are several, and separates them', () => {
    renderIcon({ providerIds: ['anthropic', 'openai'] });

    expect(screen.getByAltText('Claude Code')).toBeInTheDocument();
    expect(screen.getByAltText('Codex')).toBeInTheDocument();
    expect(screen.getByTestId('ai-tool-icon')).toHaveTextContent(',');
    expect(screen.getByTestId('ai-tool-icon')).not.toHaveTextContent('Claude Code');
  });

  it('keeps the order the agents were selected in', () => {
    renderIcon({ providerIds: ['openai', 'anthropic'] });

    expect(screen.getAllByRole('img').map(img => img.getAttribute('alt'))).toEqual([
      'Codex',
      'Claude Code',
    ]);
  });

  it('names a provider that has no icon', () => {
    renderIcon({ providerIds: ['anthropic', 'openai'], aiProviders: [] });

    expect(screen.getByTestId('ai-tool-icon')).toHaveTextContent('Claude Code, Codex');
  });

  it('falls back to the recorded id for an agent the cluster no longer publishes', () => {
    renderIcon({ providerIds: ['gone'] });

    expect(screen.getByTestId('ai-tool-icon')).toHaveTextContent('gone');
  });

  it('hides an icon the browser cannot load rather than showing a broken image', () => {
    renderIcon();

    const icon = screen.getByAltText('Claude Code');
    fireEvent.error(icon);

    expect(icon).not.toBeVisible();
  });
});
