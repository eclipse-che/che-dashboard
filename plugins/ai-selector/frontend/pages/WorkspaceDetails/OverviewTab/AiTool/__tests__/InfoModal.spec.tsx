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

import { AiToolInfoModal } from '@/plugins/ai-selector/pages/WorkspaceDetails/OverviewTab/AiTool/InfoModal';
import getComponentRenderer, { fireEvent, screen } from '@/services/__mocks__/getComponentRenderer';

const mockOnClose = jest.fn();

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
): React.ReactElement {
  return (
    <AiToolInfoModal
      isOpen={isOpen}
      aiTools={tools}
      aiProviders={providers}
      onClose={mockOnClose}
    />
  );
}

describe('AiToolInfoModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show empty state message when aiTools is empty', () => {
    renderComponent(true, [], []);

    expect(
      screen.getByText(
        'No AI tools are available. Ask your administrator to configure AI tools in the CheCluster custom resource.',
      ),
    ).toBeInTheDocument();
  });

  it('should render tool names as links', () => {
    renderComponent(true, aiTools, aiProviders);

    const claudeLink = screen.getByRole('link', { name: 'Claude Code' });
    expect(claudeLink).toHaveAttribute('href', 'https://claude.ai');
    expect(claudeLink).toHaveAttribute('target', '_blank');

    const codexLink = screen.getByRole('link', { name: 'Codex' });
    expect(codexLink).toHaveAttribute('href', 'https://openai.com');
    expect(codexLink).toHaveAttribute('target', '_blank');
  });

  it('should show provider descriptions', () => {
    renderComponent(true, aiTools, aiProviders);

    expect(screen.getByText(/Claude AI coding assistant/)).toBeInTheDocument();
    expect(screen.getByText(/OpenAI Codex assistant/)).toBeInTheDocument();
  });

  it('should call onClose when modal is closed', () => {
    renderComponent(true, aiTools, aiProviders);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
