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

import { api } from '@eclipse-che/common';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { AiProviderEntry } from '@/components/AiSelector/Gallery/Entry';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';

const { renderComponent } = getComponentRenderer(getComponent);

const mockOnSelect = jest.fn();
const mockOnVersionChange = jest.fn();

const geminiTool: api.AiToolDefinition = {
  providerId: 'google/gemini',
  tag: 'latest',
  name: 'Gemini',
  url: 'https://github.com/google-gemini/gemini-cli',
  binary: 'gemini',
  pattern: 'bundle' as const,
  injectorImage: 'quay.io/example/gemini-cli:next',
  envVarName: 'GEMINI_API_KEY',
};

const geminiToolV2: api.AiToolDefinition = {
  ...geminiTool,
  tag: 'v2',
  injectorImage: 'quay.io/example/gemini-cli:v2',
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('AiProviderEntry', () => {
  it('renders provider name', () => {
    renderComponent([geminiTool], false, false);
    expect(screen.getByText('Gemini')).toBeInTheDocument();
  });

  it('calls onSelect when the card is clicked and not already selected', async () => {
    renderComponent([geminiTool], false, false);
    const card = screen.getByText('Gemini').closest('[class*="pf-v6-c-card"]');
    await userEvent.click(card!);
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith('google/gemini');
  });

  it('calls onToggle when already selected (to deselect)', async () => {
    renderComponent([geminiTool], true, false);
    const card = screen.getByText('Gemini').closest('[class*="pf-v6-c-card"]');
    await userEvent.click(card!);
    expect(mockOnSelect).toHaveBeenCalledWith('google/gemini');
  });

  it('shows "Key configured" badge when key exists', () => {
    renderComponent([geminiTool], false, true);
    expect(screen.getByText(/Key configured/i)).toBeInTheDocument();
  });

  it('does not show key badge when no key exists', () => {
    renderComponent([geminiTool], false, false);
    expect(screen.queryByText(/Key configured/i)).toBeNull();
  });

  it('shows Tech-Preview badge when provider has Tech-Preview tag', () => {
    renderComponent([geminiTool], false, false, ['Tech-Preview']);
    expect(screen.getByText('Tech-Preview')).toBeInTheDocument();
  });

  it('does not show Tech-Preview badge when provider has no tags', () => {
    renderComponent([geminiTool], false, false);
    expect(screen.queryByText('Tech-Preview')).toBeNull();
  });

  describe('version dropdown', () => {
    it('does not show version dropdown when onVersionChange is not provided', () => {
      renderComponent([geminiTool], false, false);
      expect(screen.queryByRole('button', { name: /version options/i })).toBeNull();
    });

    it('does not show version dropdown for multi-version tool when onVersionChange is not provided', () => {
      renderComponent([geminiTool, geminiToolV2], false, false);
      expect(screen.queryByRole('button', { name: /version options/i })).toBeNull();
    });

    it('does not show version dropdown for single-version tool even when onVersionChange is provided', () => {
      renderComponent(
        [geminiTool],
        false,
        false,
        undefined,
        undefined,
        undefined,
        mockOnVersionChange,
      );
      expect(screen.queryByRole('button', { name: /version options/i })).toBeNull();
    });

    it('shows version dropdown when onVersionChange is provided and multiple versions exist', () => {
      renderComponent(
        [geminiTool, geminiToolV2],
        false,
        false,
        undefined,
        undefined,
        undefined,
        mockOnVersionChange,
      );
      expect(screen.getByRole('button', { name: /version options/i })).toBeInTheDocument();
    });

    it('opens dropdown and shows all version tags when button is clicked', async () => {
      renderComponent(
        [geminiTool, geminiToolV2],
        false,
        false,
        undefined,
        undefined,
        undefined,
        mockOnVersionChange,
      );
      const btn = screen.getByRole('button', { name: /version options/i });
      await userEvent.click(btn);
      const menuItems = screen.getAllByTestId('ai-provider-version-option');
      expect(menuItems).toHaveLength(2);
      expect(screen.getByText('v2')).toBeInTheDocument();
    });

    it('shows the version label for the active tool', () => {
      renderComponent([geminiTool], false, false);
      expect(screen.getByText('latest')).toBeInTheDocument();
    });

    it('switches active tool when a version is selected from dropdown', async () => {
      renderComponent(
        [geminiTool, geminiToolV2],
        false,
        false,
        undefined,
        undefined,
        undefined,
        mockOnVersionChange,
      );
      const btn = screen.getByRole('button', { name: /version options/i });
      await userEvent.click(btn);
      const v2Item = screen.getByText('v2');
      expect(v2Item).toBeInTheDocument();
      await userEvent.click(v2Item);
      expect(btn).toHaveAttribute('aria-expanded', 'false');
    });

    it('calls onVersionChange when version changes on a selected card', async () => {
      renderComponent(
        [geminiTool, geminiToolV2],
        true,
        false,
        undefined,
        undefined,
        undefined,
        mockOnVersionChange,
      );
      const btn = screen.getByRole('button', { name: /version options/i });
      await userEvent.click(btn);
      const v2Item = screen.getByText('v2');
      await userEvent.click(v2Item);
      expect(mockOnVersionChange).toHaveBeenCalledTimes(1);
      expect(mockOnVersionChange).toHaveBeenCalledWith('google/gemini', 'v2');
      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe('icon and description props', () => {
    it('renders the provider icon when icon prop is provided', () => {
      renderComponent([geminiTool], false, false, undefined, 'https://example.com/icon.png');
      const img = screen.getByRole('img', { name: /gemini/i });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/icon.png');
    });

    it('does not render an img element when icon prop is absent', () => {
      renderComponent([geminiTool], false, false);
      expect(screen.queryByRole('img')).toBeNull();
    });

    it('hides the icon image when it fails to load', () => {
      renderComponent([geminiTool], false, false, undefined, 'https://example.com/icon.png');
      const img = screen.getByRole('img');
      fireEvent.error(img);
      expect(img).toHaveStyle('display: none');
    });

    it('renders description in card footer when description is provided', () => {
      renderComponent([geminiTool], false, false, undefined, undefined, 'Gemini CLI description');
      expect(screen.getByText('Gemini CLI description')).toBeInTheDocument();
    });

    it('does not render card footer when description is absent', () => {
      renderComponent([geminiTool], false, false);
      expect(screen.queryByText('Gemini CLI description')).toBeNull();
    });
  });

  describe('componentDidUpdate', () => {
    it('falls back to first tool when the previously active tag is no longer in toolGroup', () => {
      const { reRenderComponent } = renderComponent([geminiTool, geminiToolV2], false, false);
      // Initially active is geminiTool (tag: 'latest')
      expect(screen.getByText('latest')).toBeInTheDocument();

      // Remove the 'latest' version — only v2 remains
      reRenderComponent([geminiToolV2], false, false);
      expect(screen.getByText('v2')).toBeInTheDocument();
    });

    it('keeps active tool when its tag still exists after toolGroup update', () => {
      const { reRenderComponent } = renderComponent([geminiTool, geminiToolV2], false, false);
      expect(screen.getByText('latest')).toBeInTheDocument();

      // Both versions still present — active stays 'latest'
      reRenderComponent([geminiToolV2, geminiTool], false, false);
      expect(screen.getByText('latest')).toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('triggers toggle when Enter key is pressed on the card', () => {
      renderComponent([geminiTool], false, false);
      const card = screen.getByText('Gemini').closest('[id^="ai-provider-card-"]') as HTMLElement;
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(mockOnSelect).toHaveBeenCalledWith('google/gemini');
    });

    it('triggers toggle when Space key is pressed on the card', () => {
      renderComponent([geminiTool], false, false);
      const card = screen.getByText('Gemini').closest('[id^="ai-provider-card-"]') as HTMLElement;
      fireEvent.keyDown(card, { key: ' ' });
      expect(mockOnSelect).toHaveBeenCalledWith('google/gemini');
    });

    it('does not throw when Arrow key is pressed', () => {
      renderComponent([geminiTool], false, false);
      const card = screen.getByText('Gemini').closest('[id^="ai-provider-card-"]') as HTMLElement;
      expect(() => fireEvent.keyDown(card, { key: 'ArrowRight' })).not.toThrow();
      expect(() => fireEvent.keyDown(card, { key: 'ArrowLeft' })).not.toThrow();
    });
  });
});

function getComponent(
  toolGroup: [api.AiToolDefinition, ...api.AiToolDefinition[]],
  isSelected: boolean,
  hasExistingKey: boolean,
  tags?: string[],
  icon?: string,
  description?: string,
  onVersionChange?: (providerId: string, tag: string) => void,
): React.ReactElement {
  return (
    <AiProviderEntry
      toolGroup={toolGroup}
      isSelected={isSelected}
      hasExistingKey={hasExistingKey}
      tags={tags}
      icon={icon}
      description={description}
      onToggle={mockOnSelect}
      onVersionChange={onVersionChange}
    />
  );
}
