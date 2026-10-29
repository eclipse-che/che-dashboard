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
import React from 'react';

import { AiToolDropdown, Props } from '@/components/AiToolSelector/Dropdown';
import { AiProviderDefinition, AiToolDefinition } from '@/services/catalog';

function tool(overrides: Partial<AiToolDefinition> = {}): AiToolDefinition {
  return {
    providerId: 'anthropic',
    tag: 'latest',
    name: 'Claude Code',
    url: '',
    binary: 'claude',
    pattern: 'init',
    injectorImage: 'quay.io/example/claude-code:latest',
    ...overrides,
  };
}

const ANTHROPIC: AiProviderDefinition = {
  id: 'anthropic',
  name: 'Anthropic',
  publisher: 'Anthropic',
  description: 'The Claude family of models.',
};

function renderDropdown(props: Partial<Props> = {}) {
  const onChange = jest.fn();
  const result = render(
    <AiToolDropdown
      aiTools={[tool()]}
      aiProviders={[ANTHROPIC]}
      customization={{ aiProviderIds: [], aiVersions: {} }}
      onChange={onChange}
      {...props}
    />,
  );
  return { ...result, onChange };
}

/** Opens the dropdown, which is otherwise collapsed to its toggle. */
async function open(): Promise<void> {
  await userEvent.click(screen.getByTestId('ai-tool-dropdown-toggle'));
}

describe('AiToolDropdown', () => {
  it('stays away when the registry publishes nothing', () => {
    renderDropdown({ aiTools: [] });

    expect(screen.queryByTestId('ai-tool-dropdown-toggle')).toBeNull();
  });

  it('says None while nothing is picked', () => {
    renderDropdown();

    expect(screen.getByTestId('ai-tool-dropdown-toggle')).toHaveTextContent('None');
  });

  it('names what is picked, so the closed dropdown still tells', () => {
    renderDropdown({ customization: { aiProviderIds: ['anthropic'], aiVersions: {} } });

    expect(screen.getByTestId('ai-tool-dropdown-toggle')).toHaveTextContent('Anthropic');
  });

  it('falls back to the id of a provider the registry does not name', () => {
    renderDropdown({
      aiProviders: [],
      customization: { aiProviderIds: ['anthropic'], aiVersions: {} },
    });

    expect(screen.getByTestId('ai-tool-dropdown-toggle')).toHaveTextContent('anthropic');
  });

  it('shows the provider name, its description and the tag that will be installed', async () => {
    renderDropdown();
    await open();

    expect(screen.getByRole('checkbox', { name: /Anthropic/ })).toBeInTheDocument();
    expect(screen.getByText('The Claude family of models.')).toBeInTheDocument();
    expect(screen.getByText('latest')).toBeInTheDocument();
  });

  it('falls back to the tool name for a provider the registry does not describe', async () => {
    renderDropdown({ aiProviders: [] });
    await open();

    expect(screen.getByRole('checkbox', { name: /Claude Code/ })).toBeInTheDocument();
  });

  it('reports a pick at once, since the form has nothing to save against', async () => {
    const { onChange } = renderDropdown();
    await open();

    await userEvent.click(screen.getByRole('checkbox', { name: /Anthropic/ }));

    expect(onChange).toHaveBeenCalledWith({ aiProviderIds: ['anthropic'], aiVersions: {} });
  });

  it('reports an empty selection when the last agent is unpicked', async () => {
    const { onChange } = renderDropdown({
      customization: { aiProviderIds: ['anthropic'], aiVersions: {} },
    });
    await open();

    await userEvent.click(screen.getByRole('checkbox', { name: /Anthropic/ }));

    expect(onChange).toHaveBeenCalledWith({ aiProviderIds: [], aiVersions: {} });
  });

  it('keeps the versions of the other agents while one is picked', async () => {
    const { onChange } = renderDropdown({
      customization: { aiProviderIds: [], aiVersions: { openai: 'next' } },
    });
    await open();

    await userEvent.click(screen.getByRole('checkbox', { name: /Anthropic/ }));

    expect(onChange).toHaveBeenCalledWith({
      aiProviderIds: ['anthropic'],
      aiVersions: { openai: 'next' },
    });
  });

  it('can be picked with the keyboard', async () => {
    const { onChange } = renderDropdown();
    await open();

    screen.getByRole('checkbox', { name: /Anthropic/ }).focus();
    await userEvent.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith({ aiProviderIds: ['anthropic'], aiVersions: {} });
  });

  it('cannot be opened while it is disabled', () => {
    renderDropdown({ isDisabled: true });

    expect(screen.getByTestId('ai-tool-dropdown-toggle')).toBeDisabled();
  });

  it('lists the agents and nothing else', async () => {
    renderDropdown();
    await open();

    expect(screen.queryByRole('link', { name: /Manage API keys/ })).toBeNull();
  });

  describe('a provider that publishes several tags', () => {
    const GROUP = [tool(), tool({ tag: 'next', injectorImage: 'quay.io/example/claude-code:1.2' })];

    /**
     * The popper that holds the version menu is marked `aria-hidden` while
     * JSDOM gives it no layout, so the items are only reachable with `hidden`.
     */
    function menuItem(tag: string): HTMLElement {
      return screen.getByRole('menuitem', { name: tag, hidden: true });
    }

    it('offers no version menu for a provider with a single tag', async () => {
      renderDropdown();
      await open();

      expect(screen.queryByRole('button', { name: /version options/ })).toBeNull();
    });

    it('shows the tag that is installed, not the first one published', async () => {
      renderDropdown({
        aiTools: GROUP,
        customization: { aiProviderIds: ['anthropic'], aiVersions: { anthropic: 'next' } },
      });
      await open();

      expect(screen.getByText('next')).toBeInTheDocument();
    });

    it('picks the provider along with the tag, so one click is enough', async () => {
      const { onChange } = renderDropdown({ aiTools: GROUP });
      await open();

      await userEvent.click(screen.getByRole('button', { name: /version options/ }));
      await userEvent.click(menuItem('next'));

      expect(onChange).toHaveBeenCalledWith({
        aiProviderIds: ['anthropic'],
        aiVersions: { anthropic: 'next' },
      });
    });

    it('changes the tag of an agent that is already picked without dropping it', async () => {
      const { onChange } = renderDropdown({
        aiTools: GROUP,
        customization: { aiProviderIds: ['anthropic'], aiVersions: {} },
      });
      await open();

      await userEvent.click(screen.getByRole('button', { name: /version options/ }));
      await userEvent.click(menuItem('next'));

      expect(onChange).toHaveBeenCalledWith({
        aiProviderIds: ['anthropic'],
        aiVersions: { anthropic: 'next' },
      });
    });

    it('closes the version menu once a tag is picked', async () => {
      renderDropdown({ aiTools: GROUP });
      await open();

      await userEvent.click(screen.getByRole('button', { name: /version options/ }));
      await userEvent.click(menuItem('next'));

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /version options/ })).toHaveAttribute(
          'aria-expanded',
          'false',
        ),
      );
    });

    it('closes the version menu again when it is toggled shut', async () => {
      renderDropdown({ aiTools: GROUP });
      await open();

      const versions = screen.getByRole('button', { name: /version options/ });
      await userEvent.click(versions);
      expect(versions).toHaveAttribute('aria-expanded', 'true');

      await userEvent.click(versions);

      expect(versions).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
