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

import { AiToolSelectorModal, Props } from '@/components/AiToolSelector/SelectorModal';
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

function renderModal(props: Partial<Props> = {}) {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  const result = render(
    <AiToolSelectorModal
      isOpen={true}
      aiTools={[tool()]}
      aiProviders={[ANTHROPIC]}
      originSelection={[]}
      originVersions={{}}
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { ...result, onConfirm, onCancel };
}

describe('AiToolSelectorModal', () => {
  it('stays out of the way while it is closed', () => {
    renderModal({ isOpen: false });

    expect(screen.queryByTestId('ai-tool-selector-modal')).toBeNull();
  });

  it('shows the provider name, its description and the tag that will be installed', () => {
    renderModal();

    expect(screen.getByRole('checkbox', { name: /Anthropic/ })).toBeInTheDocument();
    expect(screen.getByText('The Claude family of models.')).toBeInTheDocument();
    expect(screen.getByText('latest')).toBeInTheDocument();
  });

  it('falls back to the tool name for a provider the registry does not describe', () => {
    renderModal({ aiProviders: [] });

    expect(screen.getByRole('checkbox', { name: /Claude Code/ })).toBeInTheDocument();
  });

  it('opens on what is installed', () => {
    renderModal({ originSelection: ['anthropic'] });

    expect(screen.getByRole('checkbox', { name: /Anthropic/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('hands back the selection on Save', async () => {
    const { onConfirm } = renderModal();

    await userEvent.click(screen.getByRole('checkbox', { name: /Anthropic/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onConfirm).toHaveBeenCalledWith(['anthropic'], {});
  });

  it('hands back an empty selection when the last agent is removed', async () => {
    const { onConfirm } = renderModal({ originSelection: ['anthropic'] });

    await userEvent.click(screen.getByRole('checkbox', { name: /Anthropic/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onConfirm).toHaveBeenCalledWith([], {});
  });

  it('cancels without reporting anything', async () => {
    const { onCancel, onConfirm } = renderModal();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('explains an empty registry rather than showing a dialog with nothing in it', () => {
    renderModal({ aiTools: [] });

    expect(screen.getByTestId('ai-tool-selector-modal')).toHaveTextContent(
      'No AI tools are available',
    );
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  describe('a provider that publishes several tags', () => {
    const GROUP = [tool(), tool({ tag: 'next', injectorImage: 'quay.io/example/claude-code:1.2' })];

    /**
     * The popper that holds the menu is marked `aria-hidden` while JSDOM gives
     * it no layout, so the items are only reachable with `hidden`.
     */
    function menuItem(tag: string): HTMLElement {
      return screen.getByRole('menuitem', { name: tag, hidden: true });
    }

    it('offers no version menu for a provider with a single tag', () => {
      renderModal();

      expect(screen.queryByRole('button', { name: /version options/ })).toBeNull();
    });

    it('shows the tag that is installed, not the first one published', () => {
      renderModal({
        aiTools: GROUP,
        originSelection: ['anthropic'],
        originVersions: { anthropic: 'next' },
      });

      expect(screen.getByText('next')).toBeInTheDocument();
    });

    it('selects the provider when a tag is picked, so one click is enough', async () => {
      const { onConfirm } = renderModal({ aiTools: GROUP });

      await userEvent.click(screen.getByRole('button', { name: /version options/ }));
      await userEvent.click(menuItem('next'));

      expect(screen.getByRole('checkbox', { name: /Anthropic/ })).toBeChecked();

      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(onConfirm).toHaveBeenCalledWith(['anthropic'], { anthropic: 'next' });
    });

    it('enables Save for a tag change alone, with the selection left as it was', async () => {
      renderModal({ aiTools: GROUP, originSelection: ['anthropic'] });
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

      await userEvent.click(screen.getByRole('button', { name: /version options/ }));
      await userEvent.click(menuItem('next'));

      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    });

    it('closes the version menu once a tag is picked', async () => {
      renderModal({ aiTools: GROUP });

      await userEvent.click(screen.getByRole('button', { name: /version options/ }));
      await userEvent.click(menuItem('next'));

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /version options/ })).toHaveAttribute(
          'aria-expanded',
          'false',
        ),
      );
    });
  });
});
