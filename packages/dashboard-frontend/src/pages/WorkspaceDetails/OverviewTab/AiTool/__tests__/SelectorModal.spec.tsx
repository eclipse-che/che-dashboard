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
import React from 'react';

import { AiToolSelectorModal } from '@/pages/WorkspaceDetails/OverviewTab/AiTool/SelectorModal';
import getComponentRenderer, { fireEvent, screen } from '@/services/__mocks__/getComponentRenderer';

const mockOnToggle = jest.fn();
const mockOnConfirm = jest.fn();
const mockOnCancel = jest.fn();

const aiTools: api.AiToolDefinition[] = [
  {
    providerId: 'anthropic/claude',
    tag: 'latest',
    name: 'Claude Code',
    url: 'https://claude.ai',
    binary: 'claude',
    pattern: 'init',
    injectorImage: 'quay.io/test/claude:latest',
    envVarName: 'ANTHROPIC_API_KEY',
  },
  {
    providerId: 'openai/codex',
    tag: 'latest',
    name: 'Codex',
    url: 'https://openai.com',
    binary: 'codex',
    pattern: 'init',
    injectorImage: 'quay.io/test/codex:latest',
  },
];

const aiProviders: api.AiProviderDefinition[] = [
  {
    id: 'anthropic/claude',
    name: 'Anthropic',
    publisher: 'Anthropic',
    description: 'Claude AI coding assistant',
  },
  {
    id: 'openai/codex',
    name: 'OpenAI',
    publisher: 'OpenAI',
    description: 'OpenAI Codex assistant',
  },
];

const { renderComponent } = getComponentRenderer(getComponent);

function getComponent(
  isOpen: boolean,
  tools: api.AiToolDefinition[],
  providers: api.AiProviderDefinition[],
  selected: string[],
  originSelection: string[],
): React.ReactElement {
  return (
    <AiToolSelectorModal
      isOpen={isOpen}
      aiTools={tools}
      aiProviders={providers}
      selected={selected}
      originSelection={originSelection}
      onToggle={mockOnToggle}
      onConfirm={mockOnConfirm}
      onCancel={mockOnCancel}
    />
  );
}

describe('AiToolSelectorModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show empty state message when aiTools is empty', () => {
    renderComponent(true, [], [], [], []);

    expect(
      screen.getByText(
        'No AI tools are available. Ask your administrator to configure AI tools in the CheCluster custom resource.',
      ),
    ).toBeInTheDocument();
  });

  it('should render checkboxes for each tool', () => {
    renderComponent(true, aiTools, aiProviders, [], []);

    expect(screen.getByRole('checkbox', { name: /Claude Code/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Codex/i })).toBeInTheDocument();
  });

  it('should show provider descriptions on checkboxes', () => {
    renderComponent(true, aiTools, aiProviders, [], []);

    expect(screen.getByText('Claude AI coding assistant')).toBeInTheDocument();
    expect(screen.getByText('OpenAI Codex assistant')).toBeInTheDocument();
  });

  it('should have Save button disabled when selection has not changed', () => {
    const selected = ['anthropic/claude'];
    renderComponent(true, aiTools, aiProviders, selected, selected);

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('should have Save button enabled when selection has changed', () => {
    renderComponent(true, aiTools, aiProviders, ['anthropic/claude'], []);

    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('should call onToggle when a checkbox is clicked', () => {
    renderComponent(true, aiTools, aiProviders, [], []);

    const checkbox = screen.getByRole('checkbox', { name: /Claude Code/i });
    fireEvent.click(checkbox);

    expect(mockOnToggle).toHaveBeenCalledWith('anthropic/claude');
  });

  it('should call onCancel when Cancel button is clicked', () => {
    renderComponent(true, aiTools, aiProviders, [], []);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should call onConfirm when Save button is clicked', () => {
    renderComponent(true, aiTools, aiProviders, ['anthropic/claude'], []);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(mockOnConfirm).toHaveBeenCalled();
  });
});
