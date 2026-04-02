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
    id: 'google/gemini/latest',
    name: 'Gemini',
    description: 'Google Gemini AI assistant',
    url: 'https://github.com/google-gemini/gemini-cli',
    binary: 'gemini',
    pattern: 'bundle' as const,
    injectorImage: 'quay.io/okurinny/tools-injector/gemini-cli:next',
    runCommandLine: 'gemini',
    envVarName: 'GEMINI_API_KEY',
  },
  {
    id: 'anthropic/claude/latest',
    name: 'Claude',
    description: 'Anthropic Claude AI assistant',
    url: 'https://claude.ai/code',
    binary: 'claude',
    pattern: 'init' as const,
    injectorImage: 'quay.io/okurinny/tools-injector/claude-code:next',
    runCommandLine: 'claude',
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

  test('renders provider descriptions', () => {
    renderComponent();

    expect(screen.getByText('Google Gemini AI assistant')).toBeInTheDocument();
    expect(screen.getByText('Anthropic Claude AI assistant')).toBeInTheDocument();
  });

  test('clicking a provider card calls onSelect', async () => {
    renderComponent();

    // Click the radio input for the first provider (Gemini)
    const geminiInput = screen.getByRole('radio', { name: /Gemini/i });
    await userEvent.click(geminiInput);

    expect(mockOnSelect).toHaveBeenCalledWith('google/gemini/latest');
  });

  test('shows "Key configured" badge when provider has an existing key', () => {
    renderComponent('google/gemini/latest', { 'google/gemini/latest': true });

    expect(screen.getByText(/Key configured/i)).toBeInTheDocument();
  });
});

function getComponent(selectedProviderId?: string, providerKeyExists?: Record<string, boolean>) {
  return (
    <AiProviderGallery
      providers={mockProviders}
      selectedProviderId={selectedProviderId}
      providerKeyExists={providerKeyExists || {}}
      onSelect={mockOnSelect}
    />
  );
}
