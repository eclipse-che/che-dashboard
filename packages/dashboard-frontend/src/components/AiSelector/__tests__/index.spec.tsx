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
import { StateMock } from '@react-mock/state';
import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';

import AiSelector, { State } from '@/components/AiSelector';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';
import { rootReducer } from '@/store/rootReducer';

jest.mock('@/components/AiSelector/Gallery');

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

const mockOnSelect = jest.fn();

const mockTools: api.AiToolDefinition[] = [
  {
    providerId: 'google/gemini',
    tag: 'latest',
    name: 'Gemini CLI',
    url: 'https://github.com/google-gemini/gemini-cli',
    binary: 'gemini',
    pattern: 'bundle' as const,
    injectorImage: 'quay.io/example/gemini-cli:next',
    envVarName: 'GEMINI_API_KEY',
  },
  {
    providerId: 'anthropic/claude',
    tag: 'latest',
    name: 'Claude Code',
    url: 'https://claude.ai/code',
    binary: 'claude',
    pattern: 'init' as const,
    injectorImage: 'quay.io/example/claude-code:next',
    envVarName: 'ANTHROPIC_API_KEY',
  },
];

describe('AiSelector', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot', () => {
    const snapshot = createSnapshot();
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('renders panel with accordion when providers exist', () => {
    renderComponent();

    expect(screen.getByText('AI Provider Selector')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use a Default AI Provider' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose an AI Provider' })).toBeInTheDocument();
  });

  test('initially shows "Use a Default AI Provider" section', () => {
    renderComponent();

    expect(screen.getByTestId('no-ai-provider-content')).not.toHaveAttribute('hidden');
    expect(screen.getByTestId('ai-provider-gallery-content')).toHaveAttribute('hidden');
  });

  test('accordion content toggling', async () => {
    renderComponent();

    const noAiButton = screen.getByRole('button', { name: 'Use a Default AI Provider' });
    const chooseAiButton = screen.getByRole('button', { name: 'Choose an AI Provider' });

    // Initially the "Use a Default AI Provider" section is visible
    expect(screen.getByTestId('no-ai-provider-content')).not.toHaveAttribute('hidden');
    expect(screen.getByTestId('ai-provider-gallery-content')).toHaveAttribute('hidden');

    // Switch to "Choose an AI Provider" section
    await userEvent.click(chooseAiButton);
    expect(screen.getByTestId('ai-provider-gallery-content')).not.toHaveAttribute('hidden');
    expect(screen.getByTestId('no-ai-provider-content')).toHaveAttribute('hidden');

    // Switch back to "Use a Default AI Provider"
    await userEvent.click(noAiButton);
    expect(screen.getByTestId('no-ai-provider-content')).not.toHaveAttribute('hidden');
    expect(screen.getByTestId('ai-provider-gallery-content')).toHaveAttribute('hidden');
  });

  test('calls onSelect with default tool IDs when switching back to "Use a Default AI Provider"', async () => {
    renderComponent();

    // First switch to "Choose an AI Provider"
    const chooseAiButton = screen.getByRole('button', { name: 'Choose an AI Provider' });
    await userEvent.click(chooseAiButton);
    mockOnSelect.mockClear();

    // Now click "Use a Default AI Provider" — should fire onSelect with the default tools
    const noAiButton = screen.getByRole('button', { name: 'Use a Default AI Provider' });
    await userEvent.click(noAiButton);

    // Falls back to alphabetically first tool since no defaultProviderIds is set in Redux
    expect(mockOnSelect).toHaveBeenCalledWith(['anthropic/claude']);
  });

  test('toggle provider from gallery', async () => {
    renderComponent({
      selectedProviderIds: ['google/gemini'],
      expandedId: 'selector',
    });

    const galleryContent = screen.getByTestId('ai-provider-gallery-content');
    expect(galleryContent).not.toHaveAttribute('hidden');

    // The mocked gallery renders a "Toggle Provider" button
    const toggleButton = screen.getByRole('button', { name: 'Toggle Provider' });
    await userEvent.click(toggleButton);

    // google/gemini was already selected, toggling removes it
    expect(mockOnSelect).toHaveBeenCalledWith([]);
  });

  test('returns null when no AI providers are configured', () => {
    const emptyStore = buildStoreWithTools([]);
    const result = render(
      <Provider store={emptyStore}>
        <AiSelector onSelect={mockOnSelect} />
      </Provider>,
    );
    expect(result.baseElement.querySelector('[class*="pf-v6-c-panel"]')).toBeNull();
  });

  test('does not fire onSelect when clicking already-open accordion item', async () => {
    renderComponent();

    // componentDidMount fires onSelect with the default tools
    expect(mockOnSelect).toHaveBeenCalledWith(['anthropic/claude']);
    mockOnSelect.mockClear();

    // "Use a Default AI Provider" is open by default — clicking it again should not fire onSelect
    const noAiButton = screen.getByRole('button', { name: 'Use a Default AI Provider' });
    await userEvent.click(noAiButton);
    await userEvent.click(noAiButton);

    expect(mockOnSelect).not.toHaveBeenCalled();
  });
});

function buildStoreWithTools(tools: api.AiToolDefinition[]) {
  return configureStore({
    reducer: rootReducer,
    preloadedState: {
      aiConfig: {
        providers: [],
        tools,
        defaultAiProviders: [],
        providerKeyExists: {},
        isLoading: false,
        error: undefined,
      },
    } as Parameters<typeof configureStore>[0]['preloadedState'],
  });
}

function getComponent(localState?: Partial<State>) {
  const store = buildStoreWithTools(mockTools);

  const component = <AiSelector onSelect={mockOnSelect} />;

  if (localState) {
    return (
      <Provider store={store}>
        <StateMock state={localState as State}>{component}</StateMock>
      </Provider>
    );
  }

  return <Provider store={store}>{component}</Provider>;
}
