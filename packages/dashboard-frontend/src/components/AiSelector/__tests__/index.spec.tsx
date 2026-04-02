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
jest.mock('@/store/AiConfig/actions', () => ({
  ...jest.requireActual('@/store/AiConfig/actions'),
  actionCreators: {
    requestAiConfig: () => () => Promise.resolve(),
    saveAiProviderKey: () => () => Promise.resolve(),
    deleteAiProviderKey: () => () => Promise.resolve(),
  },
}));

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

const mockOnSelect = jest.fn();

const mockTools: api.AiToolDefinition[] = [
  {
    id: 'gemini-cli',
    providerId: 'google/gemini/latest',
    name: 'Gemini CLI',
    description: 'Google Gemini AI assistant for the terminal',
    url: 'https://github.com/google-gemini/gemini-cli',
    binary: 'gemini',
    pattern: 'bundle' as const,
    injectorImage: 'quay.io/okurinny/tools-injector/gemini-cli:next',
    runCommandLine: 'gemini',
    envVarName: 'GEMINI_API_KEY',
  },
  {
    id: 'claude-code',
    providerId: 'anthropic/claude/latest',
    name: 'Claude Code',
    description: 'Anthropic Claude AI coding assistant for terminal',
    url: 'https://claude.ai/code',
    binary: 'claude',
    pattern: 'init' as const,
    injectorImage: 'quay.io/okurinny/tools-injector/claude-code:next',
    runCommandLine: 'claude',
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

  test('calls onSelect with default tool ID when switching back to "Use a Default AI Provider"', async () => {
    renderComponent();

    // First switch to "Choose an AI Provider"
    const chooseAiButton = screen.getByRole('button', { name: 'Choose an AI Provider' });
    await userEvent.click(chooseAiButton);
    mockOnSelect.mockClear();

    // Now click "Use a Default AI Provider" — should fire onSelect with the default tool
    const noAiButton = screen.getByRole('button', { name: 'Use a Default AI Provider' });
    await userEvent.click(noAiButton);

    // Falls back to alphabetically first tool since no defaultProviderId is set in Redux
    expect(mockOnSelect).toHaveBeenCalledWith('claude-code');
  });

  test('select provider from gallery', async () => {
    renderComponent({
      selectedProviderId: 'google/gemini/latest',
      expandedId: 'selector',
    });

    const galleryContent = screen.getByTestId('ai-provider-gallery-content');
    expect(galleryContent).not.toHaveAttribute('hidden');

    // The mocked gallery renders a "Select Provider" button
    const selectButton = screen.getByRole('button', { name: 'Select Provider' });
    await userEvent.click(selectButton);

    expect(mockOnSelect).toHaveBeenCalledWith('google/gemini/latest');
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

    // componentDidMount fires onSelect with the default tool
    expect(mockOnSelect).toHaveBeenCalledWith('claude-code');
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
        defaultProviderId: undefined,
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
