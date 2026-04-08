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
import userEvent from '@testing-library/user-event';
import React from 'react';

import { AiProviderGallery } from '@/components/AiSelector/Gallery';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

const mockOnSelect = jest.fn();

const mockProviders: api.AiToolDefinition[] = [
  {
    providerId: 'google/gemini',
    tag: 'latest',
    name: 'Gemini',
    url: 'https://github.com/google-gemini/gemini-cli',
    binary: 'gemini',
    pattern: 'bundle' as const,
    injectorImage: 'quay.io/example/gemini-cli:next',
    envVarName: 'GEMINI_API_KEY',
  },
  {
    providerId: 'anthropic/claude',
    tag: 'latest',
    name: 'Claude',
    url: 'https://claude.ai/code',
    binary: 'claude',
    pattern: 'init' as const,
    injectorImage: 'quay.io/example/claude-code:next',
    envVarName: 'ANTHROPIC_API_KEY',
  },
];

describe('AiProviderGallery', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot', () => {
    const snapshot = createSnapshot();
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('renders all provider cards', () => {
    renderComponent();

    expect(screen.getByText('Gemini')).toBeInTheDocument();
    expect(screen.getByText('Claude')).toBeInTheDocument();
  });

  test('clicking a provider card calls onSelect', async () => {
    renderComponent();

    // Click the checkbox input for the first provider (Gemini)
    const geminiInput = screen.getByRole('checkbox', { name: /Gemini/i });
    await userEvent.click(geminiInput);

    expect(mockOnSelect).toHaveBeenCalledWith('google/gemini');
  });

  test('shows "Key configured" badge when provider has an existing key', () => {
    renderComponent('google/gemini', { 'google/gemini': true });

    expect(screen.getByText(/Key configured/i)).toBeInTheDocument();
  });
});

function getComponent(selectedProviderId?: string, providerKeyExists?: Record<string, boolean>) {
  return (
    <AiProviderGallery
      providers={mockProviders}
      aiProviders={[]}
      selectedProviderIds={selectedProviderId ? [selectedProviderId] : []}
      providerKeyExists={providerKeyExists || {}}
      onToggle={mockOnSelect}
    />
  );
}
