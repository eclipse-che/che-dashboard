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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { AiProviderKeysAddEditModal } from '@/pages/UserPreferences/AiProviderKeys/AddEditModal';

const mockProvider: api.AiToolDefinition = {
  providerId: 'google/gemini',
  tag: 'next',
  name: 'Gemini CLI',
  url: 'https://ai.google.dev',
  binary: 'gemini',
  pattern: 'bundle',
  injectorImage: 'quay.io/example/gemini-cli:next',
  envVarName: 'GEMINI_API_KEY',
};

describe('AiProviderKeysAddEditModal', () => {
  it('should show "Add AI Provider Key" title in add mode', () => {
    render(
      <AiProviderKeysAddEditModal
        isOpen={true}
        availableProviders={[mockProvider]}
        onSave={jest.fn()}
        onCloseModal={jest.fn()}
      />,
    );

    expect(screen.getByText('Add AI Provider Key')).toBeDefined();
  });

  it('should show update title when fixedProvider is set', () => {
    render(
      <AiProviderKeysAddEditModal
        isOpen={true}
        availableProviders={[mockProvider]}
        fixedProvider={mockProvider}
        onSave={jest.fn()}
        onCloseModal={jest.fn()}
      />,
    );

    expect(screen.getByText('Update Gemini CLI API Key')).toBeDefined();
  });

  it('should disable save button initially', () => {
    render(
      <AiProviderKeysAddEditModal
        isOpen={true}
        availableProviders={[mockProvider]}
        onSave={jest.fn()}
        onCloseModal={jest.fn()}
      />,
    );

    expect(screen.getByTestId('save-button')).toBeDisabled();
  });

  it('should call onCloseModal when cancel is clicked', async () => {
    const onCloseModal = jest.fn();
    render(
      <AiProviderKeysAddEditModal
        isOpen={true}
        availableProviders={[mockProvider]}
        onSave={jest.fn()}
        onCloseModal={onCloseModal}
      />,
    );

    await userEvent.click(screen.getByTestId('cancel-button'));
    expect(onCloseModal).toHaveBeenCalledTimes(1);
  });

  it('should enable save button after entering API key', async () => {
    render(
      <AiProviderKeysAddEditModal
        isOpen={true}
        availableProviders={[mockProvider]}
        onSave={jest.fn()}
        onCloseModal={jest.fn()}
      />,
    );

    const input = screen.getByLabelText('API key input');
    await userEvent.type(input, 'test-api-key');

    expect(screen.getByTestId('save-button')).not.toBeDisabled();
  });

  it('should call onSave with providerId and apiKey', async () => {
    const onSave = jest.fn();
    render(
      <AiProviderKeysAddEditModal
        isOpen={true}
        availableProviders={[mockProvider]}
        fixedProvider={mockProvider}
        onSave={onSave}
        onCloseModal={jest.fn()}
      />,
    );

    const input = screen.getByLabelText('API key input');
    await userEvent.type(input, 'my-secret-key');
    await userEvent.click(screen.getByTestId('save-button'));

    expect(onSave).toHaveBeenCalledWith('google/gemini', 'my-secret-key');
  });
});
