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

import { AiProviderKeysDeleteModal } from '@/plugins/ai-selector/pages/UserPreferences/AiProviderKeys/DeleteModal';

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

const mockProvider2: api.AiToolDefinition = {
  providerId: 'anthropic/claude',
  tag: 'next',
  name: 'Claude Code',
  url: 'https://claude.ai/code',
  binary: 'claude',
  pattern: 'init',
  injectorImage: 'quay.io/example/claude-code:next',
  envVarName: 'ANTHROPIC_API_KEY',
};

describe('AiProviderKeysDeleteModal', () => {
  it('should show single provider delete title', () => {
    render(
      <AiProviderKeysDeleteModal
        isOpen={true}
        providers={[mockProvider]}
        onCloseModal={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(screen.getByText('Delete Gemini CLI API Key')).toBeDefined();
  });

  it('should show multi-provider delete title', () => {
    render(
      <AiProviderKeysDeleteModal
        isOpen={true}
        providers={[mockProvider, mockProvider2]}
        onCloseModal={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(screen.getByText('Delete 2 API Keys')).toBeDefined();
  });

  it('should disable delete button until checkbox is checked', async () => {
    render(
      <AiProviderKeysDeleteModal
        isOpen={true}
        providers={[mockProvider]}
        onCloseModal={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    expect(deleteBtn).toBeDisabled();

    await userEvent.click(screen.getByRole('checkbox'));
    expect(deleteBtn).not.toBeDisabled();
  });

  it('should call onDelete when delete is clicked', async () => {
    const onDelete = jest.fn();
    render(
      <AiProviderKeysDeleteModal
        isOpen={true}
        providers={[mockProvider]}
        onCloseModal={jest.fn()}
        onDelete={onDelete}
      />,
    );

    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onDelete).toHaveBeenCalledWith([mockProvider]);
  });

  it('should call onCloseModal when cancel is clicked', async () => {
    const onCloseModal = jest.fn();
    render(
      <AiProviderKeysDeleteModal
        isOpen={true}
        providers={[mockProvider]}
        onCloseModal={onCloseModal}
        onDelete={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCloseModal).toHaveBeenCalledTimes(1);
  });
});
