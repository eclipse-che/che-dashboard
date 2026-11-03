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
import userEvent from '@testing-library/user-event';
import React from 'react';

import { AiProviderEntry, Props } from '@/components/AiProviderSelector/Entry';
import { AiToolDefinition } from '@/services/catalog';

const CLAUDE: AiToolDefinition = {
  providerId: 'anthropic',
  tag: 'latest',
  name: 'Claude Code',
  url: '',
  binary: 'claude',
  pattern: 'init',
  injectorImage: 'quay.io/example/claude-code:latest',
};

const CLAUDE_NEXT: AiToolDefinition = { ...CLAUDE, tag: 'next' };

function renderEntry(props: Partial<Props> = {}) {
  const onToggle = jest.fn();
  const onVersionChange = jest.fn();
  const result = render(
    <AiProviderEntry
      toolGroup={[CLAUDE]}
      isSelected={false}
      onToggle={onToggle}
      onVersionChange={onVersionChange}
      {...props}
    />,
  );
  return { ...result, onToggle, onVersionChange };
}

describe('AiProviderEntry', () => {
  it('shows what the registry says about the provider', () => {
    renderEntry({ description: 'An agent that writes code.' });

    expect(screen.getByText('Claude Code')).toBeInTheDocument();
    expect(screen.getByText('latest')).toBeInTheDocument();
    expect(screen.getByText('An agent that writes code.')).toBeInTheDocument();
  });

  it('picks the provider when the card is clicked', async () => {
    const { onToggle } = renderEntry();

    await userEvent.click(screen.getByTestId('ai-provider-card-anthropic'));

    expect(onToggle).toHaveBeenCalledWith('anthropic');
  });

  it('picks the provider from the keyboard, as a card is not a button', async () => {
    const { onToggle } = renderEntry();

    screen.getByTestId('ai-provider-card-anthropic').focus();
    await userEvent.keyboard('{Enter}');

    expect(onToggle).toHaveBeenCalledWith('anthropic');
  });

  it('walks the gallery with the arrow keys', async () => {
    const onToggle = jest.fn();
    const onVersionChange = jest.fn();
    render(
      <div>
        <AiProviderEntry
          toolGroup={[CLAUDE]}
          isSelected={false}
          onToggle={onToggle}
          onVersionChange={onVersionChange}
        />
        <AiProviderEntry
          toolGroup={[{ ...CLAUDE, providerId: 'google/gemini', name: 'Gemini CLI' }]}
          isSelected={false}
          onToggle={onToggle}
          onVersionChange={onVersionChange}
        />
      </div>,
    );

    const first = screen.getByTestId('ai-provider-card-anthropic');
    first.focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(screen.getByTestId('ai-provider-card-google-gemini')).toHaveFocus();

    await userEvent.keyboard('{ArrowLeft}');

    expect(first).toHaveFocus();
  });

  it('leaves the card alone for keys that mean nothing to it', async () => {
    const { onToggle } = renderEntry();

    screen.getByTestId('ai-provider-card-anthropic').focus();
    await userEvent.keyboard('{Escape}');

    expect(onToggle).not.toHaveBeenCalled();
  });

  it('offers no version menu for a provider that publishes one tag', () => {
    renderEntry();

    expect(screen.queryByRole('button', { name: /version options/ })).toBeNull();
  });

  it('picks a version, which is also a way of asking for the tool', async () => {
    const { onVersionChange } = renderEntry({ toolGroup: [CLAUDE, CLAUDE_NEXT] });

    await userEvent.click(screen.getByRole('button', { name: 'Claude Code version options' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'next' }));

    expect(onVersionChange).toHaveBeenCalledWith('anthropic', 'next');
  });

  it('shows the tag the gallery says is active', () => {
    renderEntry({ toolGroup: [CLAUDE, CLAUDE_NEXT], activeTag: 'next' });

    expect(screen.getByText('next')).toBeInTheDocument();
  });

  it('marks a provider the cluster publishes as a preview', () => {
    renderEntry({ tags: ['Tech-Preview', 'AI'] });

    expect(screen.getByText('Tech-Preview')).toBeInTheDocument();
    expect(screen.queryByText('AI')).toBeNull();
  });

  it('hides an icon the registry points at but the cluster cannot serve', () => {
    renderEntry({ icon: '/missing.svg' });

    const icon = screen.getByAltText('Claude Code icon');
    expect(icon).toBeVisible();

    fireEvent.error(icon);

    expect(icon).not.toBeVisible();
  });

  it('stays put while a sandbox is being created', async () => {
    const { onToggle } = renderEntry({ isDisabled: true });

    await userEvent.click(screen.getByTestId('ai-provider-card-anthropic'));

    expect(onToggle).not.toHaveBeenCalled();
  });
});
