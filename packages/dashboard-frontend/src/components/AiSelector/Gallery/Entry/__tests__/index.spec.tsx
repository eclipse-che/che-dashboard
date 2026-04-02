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

import { AiProviderEntry } from '@/components/AiSelector/Gallery/Entry';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';

const { renderComponent } = getComponentRenderer(getComponent);

const mockOnSelect = jest.fn();

const geminiProvider: api.AiToolDefinition = {
  id: 'google/gemini/latest',
  name: 'Gemini',
  description: 'Google Gemini AI assistant',
  url: 'https://github.com/google-gemini/gemini-cli',
  binary: 'gemini',
  pattern: 'bundle' as const,
  injectorImage: 'quay.io/okurinny/tools-injector/gemini-cli:next',
  runCommandLine: 'gemini',
  envVarName: 'GEMINI_API_KEY',
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('AiProviderEntry', () => {
  it('renders provider name', () => {
    renderComponent(geminiProvider, false, false);
    expect(screen.getByText('Gemini')).toBeInTheDocument();
  });

  it('renders provider description', () => {
    renderComponent(geminiProvider, false, false);
    expect(screen.getByText('Google Gemini AI assistant')).toBeInTheDocument();
  });

  it('calls onSelect when the card is clicked and not already selected', async () => {
    renderComponent(geminiProvider, false, false);
    const card = screen.getByText('Gemini').closest('[class*="pf-v6-c-card"]');
    await userEvent.click(card!);
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith('google/gemini/latest');
  });

  it('does not call onSelect when already selected', async () => {
    renderComponent(geminiProvider, true, false);
    const radio = screen.getByRole('radio');
    await userEvent.click(radio);
    expect(mockOnSelect).not.toHaveBeenCalled();
  });

  it('shows "Key configured" badge when key exists', () => {
    renderComponent(geminiProvider, false, true);
    expect(screen.getByText(/Key configured/i)).toBeInTheDocument();
  });

  it('does not show key badge when no key exists', () => {
    renderComponent(geminiProvider, false, false);
    expect(screen.queryByText(/Key configured/i)).toBeNull();
  });
});

function getComponent(
  provider: api.AiToolDefinition,
  isSelected: boolean,
  hasExistingKey: boolean,
): React.ReactElement {
  return (
    <AiProviderEntry
      provider={provider}
      isSelected={isSelected}
      hasExistingKey={hasExistingKey}
      onSelect={mockOnSelect}
    />
  );
}
