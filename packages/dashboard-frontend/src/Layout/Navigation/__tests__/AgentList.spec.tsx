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
import { Nav } from '@patternfly/react-core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { NavigationAgentList } from '@/Layout/Navigation/AgentList';
import { AgentPodPhase, AgentPodStatus } from '@/store/LocalDevfiles';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    themePreference: 'LIGHT',
    isDarkTheme: false,
    setThemePreference: jest.fn(),
  }),
}));

function buildAgentDef(overrides?: Partial<api.AiAgentDefinition>): api.AiAgentDefinition {
  return {
    id: 'test-agent',
    name: 'Test Agent',
    publisher: 'test-publisher',
    description: 'A test agent',
    icon: '',
    docsUrl: '',
    image: 'test-image',
    tag: 'latest',
    memoryLimit: '512Mi',
    cpuLimit: '500m',
    terminalPort: 8080,
    env: [],
    initCommand: '',
    ...overrides,
  };
}

function buildAgentPodStatus(overrides?: Partial<AgentPodStatus>): AgentPodStatus {
  return {
    agentId: 'test-agent',
    name: 'agent-test-agent',
    phase: AgentPodPhase.RUNNING,
    ready: true,
    serviceUrl: undefined,
    ...overrides,
  };
}

const mockStopAgent = jest.fn();

function renderComponent(
  agentPodStatuses: AgentPodStatus[] = [],
  agents: api.AiAgentDefinition[] = [],
) {
  return render(
    <Nav onSelect={jest.fn()}>
      <NavigationAgentList
        activePath="/some-path"
        agentPodStatuses={agentPodStatuses}
        agents={agents}
        stopAgent={mockStopAgent}
      />
    </Nav>,
  );
}

describe('NavigationAgentList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('empty state', () => {
    test('should not render AGENT PODS title when no agent pod statuses', () => {
      renderComponent([], []);
      expect(screen.queryByText('AGENT PODS')).not.toBeInTheDocument();
    });
  });

  describe('with agent pods', () => {
    const agents: api.AiAgentDefinition[] = [
      buildAgentDef({ id: 'anthropic/claude', name: 'Claude Code', description: 'AI assistant' }),
      buildAgentDef({ id: 'openai/gpt', name: 'GPT Agent', description: '' }),
    ];

    test('should render AGENT PODS nav group title', () => {
      const statuses = [buildAgentPodStatus({ agentId: 'anthropic/claude', name: 'agent-claude' })];
      renderComponent(statuses, agents);
      expect(screen.getByText('AGENT PODS')).toBeInTheDocument();
    });

    test('should render agent pod items', () => {
      const statuses = [
        buildAgentPodStatus({ agentId: 'anthropic/claude', name: 'agent-claude' }),
        buildAgentPodStatus({
          agentId: 'openai/gpt',
          name: 'agent-gpt',
          phase: AgentPodPhase.PENDING,
          ready: false,
        }),
      ];
      renderComponent(statuses, agents);
      const items = screen.getAllByTestId('agent-pod-item');
      expect(items).toHaveLength(2);
    });

    test('should display agent name without agent- prefix', () => {
      const statuses = [buildAgentPodStatus({ agentId: 'anthropic/claude', name: 'agent-claude' })];
      renderComponent(statuses, agents);
      expect(screen.getByText('claude')).toBeInTheDocument();
    });

    test('should display full name when name has no agent- prefix', () => {
      const statuses = [buildAgentPodStatus({ agentId: 'anthropic/claude', name: 'claude-pod' })];
      renderComponent(statuses, agents);
      expect(screen.getByText('claude-pod')).toBeInTheDocument();
    });

    test('should render status indicator for each agent', () => {
      const statuses = [buildAgentPodStatus({ agentId: 'anthropic/claude', name: 'agent-claude' })];
      renderComponent(statuses, agents);
      expect(screen.getByTestId('agent-status-indicator')).toBeInTheDocument();
    });

    test('should render multiple status indicators for multiple agents', () => {
      const statuses = [
        buildAgentPodStatus({ agentId: 'anthropic/claude', name: 'agent-claude' }),
        buildAgentPodStatus({ agentId: 'openai/gpt', name: 'agent-gpt' }),
      ];
      renderComponent(statuses, agents);
      expect(screen.getAllByTestId('agent-status-indicator')).toHaveLength(2);
    });
  });

  describe('agent pod phases', () => {
    const agents = [buildAgentDef({ id: 'test-agent', name: 'Test Agent' })];

    test('should render RUNNING phase with ready=true', () => {
      const statuses = [buildAgentPodStatus({ phase: AgentPodPhase.RUNNING, ready: true })];
      renderComponent(statuses, agents);
      expect(screen.getByTestId('agent-status-indicator')).toBeInTheDocument();
    });

    test('should render RUNNING phase with ready=false as STARTING', () => {
      const statuses = [buildAgentPodStatus({ phase: AgentPodPhase.RUNNING, ready: false })];
      renderComponent(statuses, agents);
      expect(screen.getByTestId('agent-status-indicator')).toBeInTheDocument();
    });

    test('should render PENDING phase', () => {
      const statuses = [buildAgentPodStatus({ phase: AgentPodPhase.PENDING, ready: false })];
      renderComponent(statuses, agents);
      expect(screen.getByTestId('agent-status-indicator')).toBeInTheDocument();
    });

    test('should render FAILED phase', () => {
      const statuses = [buildAgentPodStatus({ phase: AgentPodPhase.FAILED, ready: false })];
      renderComponent(statuses, agents);
      expect(screen.getByTestId('agent-status-indicator')).toBeInTheDocument();
    });

    test('should render UNKNOWN phase', () => {
      const statuses = [buildAgentPodStatus({ phase: AgentPodPhase.UNKNOWN, ready: false })];
      renderComponent(statuses, agents);
      expect(screen.getByTestId('agent-status-indicator')).toBeInTheDocument();
    });

    test('should render SUCCEEDED phase', () => {
      const statuses = [buildAgentPodStatus({ phase: AgentPodPhase.SUCCEEDED, ready: false })];
      renderComponent(statuses, agents);
      expect(screen.getByTestId('agent-status-indicator')).toBeInTheDocument();
    });
  });

  describe('stop action', () => {
    const agents = [buildAgentDef({ id: 'test-agent', name: 'Test Agent' })];

    test('should show dropdown with Stop option when kebab menu is clicked', async () => {
      const statuses = [buildAgentPodStatus()];
      renderComponent(statuses, agents);

      // Hover over the nav item to make actions visible
      const navItem = screen.getByTestId('agent-pod-item').closest('[class*="navItem"]')!;
      await userEvent.hover(navItem);

      const kebabButton = screen.getByRole('button', { name: 'Agent actions' });
      await userEvent.click(kebabButton);

      expect(screen.getByText('Stop')).toBeInTheDocument();
    });

    test('should call stopAgent when Stop is clicked', async () => {
      const statuses = [buildAgentPodStatus({ agentId: 'my-agent-id' })];
      renderComponent(statuses, agents);

      const navItem = screen.getByTestId('agent-pod-item').closest('[class*="navItem"]')!;
      await userEvent.hover(navItem);

      const kebabButton = screen.getByRole('button', { name: 'Agent actions' });
      await userEvent.click(kebabButton);

      const stopButton = screen.getByText('Stop');
      await userEvent.click(stopButton);

      expect(mockStopAgent).toHaveBeenCalledWith('my-agent-id');
    });

    test('should close dropdown after Stop is clicked', async () => {
      const statuses = [buildAgentPodStatus()];
      renderComponent(statuses, agents);

      const navItem = screen.getByTestId('agent-pod-item').closest('[class*="navItem"]')!;
      await userEvent.hover(navItem);

      const kebabButton = screen.getByRole('button', { name: 'Agent actions' });
      await userEvent.click(kebabButton);
      expect(kebabButton).toHaveAttribute('aria-expanded', 'true');

      const stopButton = screen.getByText('Stop');
      await userEvent.click(stopButton);

      // Dropdown toggle should be collapsed after Stop is clicked
      expect(kebabButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('agent tooltip content', () => {
    test('should render agent pod item when agent definition matches by prefix', () => {
      const agents = [
        buildAgentDef({ id: 'anthropic/claude', name: 'Claude Code', description: 'AI assistant' }),
      ];
      const statuses = [
        buildAgentPodStatus({ agentId: 'anthropic/claude-instance-1', name: 'agent-claude' }),
      ];
      renderComponent(statuses, agents);
      expect(screen.getByTestId('agent-pod-item')).toBeInTheDocument();
    });

    test('should render agent pod item when no matching definition exists', () => {
      const statuses = [buildAgentPodStatus({ agentId: 'unknown-agent', name: 'agent-unknown' })];
      renderComponent(statuses, []);
      expect(screen.getByTestId('agent-pod-item')).toBeInTheDocument();
    });

    test('should render agent pod item with agent that has no description', () => {
      const agents = [buildAgentDef({ id: 'openai/gpt', name: 'GPT Agent', description: '' })];
      const statuses = [buildAgentPodStatus({ agentId: 'openai/gpt', name: 'agent-gpt' })];
      renderComponent(statuses, agents);
      expect(screen.getByTestId('agent-pod-item')).toBeInTheDocument();
    });
  });

  describe('hover and focus states', () => {
    const agents = [buildAgentDef({ id: 'test-agent', name: 'Test Agent' })];

    test('should handle mouse enter and leave events', async () => {
      const statuses = [buildAgentPodStatus()];
      renderComponent(statuses, agents);
      const item = screen.getByTestId('agent-pod-item').closest('[class*="navItem"]');
      expect(item).toBeDefined();

      await userEvent.hover(item!);
      await userEvent.unhover(item!);
    });

    test('should handle focus and blur events', () => {
      const statuses = [buildAgentPodStatus()];
      renderComponent(statuses, agents);
      const item = screen.getByTestId('agent-pod-item').closest('[class*="navItem"]');
      expect(item).toBeDefined();

      item!.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
      item!.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    });
  });
});
