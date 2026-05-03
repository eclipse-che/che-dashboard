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
import React from 'react';

import { AiToolIcon } from '@/plugins/ai-selector/components/AiToolIcon';
import { Workspace } from '@/services/workspace-adapter';

jest.mock('@/plugins/ai-selector/components/AiToolIcon/index.module.css', () => ({
  icon: 'icon',
  container: 'container',
  name: 'name',
}));

const mockGetInjectedAiToolIds = jest.fn<string[], [Workspace, api.AiToolDefinition[]]>();
jest.mock('@/plugins/ai-selector/services/helpers/aiTools', () => ({
  getInjectedAiToolIds: (...args: [Workspace, api.AiToolDefinition[]]) =>
    mockGetInjectedAiToolIds(...args),
}));

const mockWorkspace: Workspace = {
  ref: {
    apiVersion: 'workspace.devfile.io/v1alpha2',
    kind: 'DevWorkspace',
    metadata: {
      name: 'test-workspace',
      namespace: 'test-ns',
      uid: 'test-uid',
    },
    spec: {
      started: true,
      template: {
        components: [],
      },
    },
  },
  id: 'test-id',
  uid: 'test-uid',
  name: 'test-workspace',
  namespace: 'test-ns',
  infrastructureNamespace: 'test-ns',
  created: Date.now(),
  updated: Date.now(),
  status: 'RUNNING',
  storageType: 'ephemeral',
  projects: [],
  isStarting: false,
  isStopped: false,
  isStopping: false,
  isRunning: true,
  hasError: false,
  error: undefined,
  isDevWorkspace: true,
  isDeprecated: false,
} as Workspace;

const mockAiTools: api.AiToolDefinition[] = [
  {
    providerId: 'anthropic/claude',
    tag: 'latest',
    name: 'Claude Code',
    url: 'https://claude.ai',
    binary: 'claude',
    pattern: 'bundle',
    injectorImage: 'quay.io/test/claude-code:latest',
  },
  {
    providerId: 'github/copilot',
    tag: 'latest',
    name: 'GitHub Copilot',
    url: 'https://copilot.github.com',
    binary: 'copilot',
    pattern: 'init',
    injectorImage: 'quay.io/test/copilot:latest',
  },
];

const mockAiProviders: api.AiProviderDefinition[] = [
  {
    id: 'anthropic/claude',
    name: 'Anthropic',
    publisher: 'Anthropic',
    icon: 'https://example.com/claude-icon.svg',
  },
  {
    id: 'github/copilot',
    name: 'GitHub',
    publisher: 'GitHub',
  },
];

describe('AiToolIcon', () => {
  beforeEach(() => {
    mockGetInjectedAiToolIds.mockReset();
  });

  it('should render "-" when no tools are injected', () => {
    mockGetInjectedAiToolIds.mockReturnValue([]);

    render(
      <AiToolIcon workspace={mockWorkspace} aiTools={mockAiTools} aiProviders={mockAiProviders} />,
    );

    expect(screen.getByText('-')).toBeTruthy();
  });

  it('should render "-" when tool IDs do not match any tool definitions', () => {
    mockGetInjectedAiToolIds.mockReturnValue(['unknown/tool']);

    render(
      <AiToolIcon workspace={mockWorkspace} aiTools={mockAiTools} aiProviders={mockAiProviders} />,
    );

    expect(screen.getByText('-')).toBeTruthy();
  });

  it('should render single tool name and icon when one tool is injected', () => {
    mockGetInjectedAiToolIds.mockReturnValue(['anthropic/claude']);

    render(
      <AiToolIcon workspace={mockWorkspace} aiTools={mockAiTools} aiProviders={mockAiProviders} />,
    );

    expect(screen.getAllByText('Claude Code').length).toBeGreaterThanOrEqual(1);

    const icon = screen.getByRole('img', { name: 'Claude Code' });
    expect(icon).toBeTruthy();
    expect(icon.getAttribute('src')).toBe('https://example.com/claude-icon.svg');
    expect(icon.classList.contains('icon')).toBe(true);
  });

  it('should render single tool name without icon when provider has no icon', () => {
    mockGetInjectedAiToolIds.mockReturnValue(['github/copilot']);

    render(
      <AiToolIcon workspace={mockWorkspace} aiTools={mockAiTools} aiProviders={mockAiProviders} />,
    );

    expect(screen.getAllByText('GitHub Copilot').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('should render multiple tool icons for multiple tools', () => {
    mockGetInjectedAiToolIds.mockReturnValue(['anthropic/claude', 'github/copilot']);

    render(
      <AiToolIcon workspace={mockWorkspace} aiTools={mockAiTools} aiProviders={mockAiProviders} />,
    );

    const icon = screen.getByRole('img', { name: 'Claude Code' });
    expect(icon).toBeTruthy();
    expect(icon.getAttribute('src')).toBe('https://example.com/claude-icon.svg');

    // GitHub Copilot has no icon, so it renders as text
    expect(screen.getByText('GitHub Copilot')).toBeTruthy();
  });
});
