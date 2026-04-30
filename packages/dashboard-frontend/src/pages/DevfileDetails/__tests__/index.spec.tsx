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

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { container } from '@/inversify.config';
import DevfileDetails from '@/pages/DevfileDetails';
import { AppAlerts } from '@/services/alerts/appAlerts';
import { AlertItem } from '@/services/helpers/types';
import { AgentPodPhase, AgentPodStatus, LocalDevfile } from '@/store/LocalDevfiles';

jest.mock('@/pages/DevfileDetails/AgentPanel');
jest.mock('@/pages/DevfileDetails/EditorPanel');

jest.mock('@/components/Head', () => {
  return function MockHead() {
    return null;
  };
});

const mockShowAlert = jest.fn();

const mockDevfile: LocalDevfile = {
  id: 'test-uuid-123',
  name: 'my-devfile',
  description: 'Test devfile',
  content: 'schemaVersion: 2.2.2\nmetadata:\n  name: my-devfile\n',
  projectNames: [],
  lastModified: '2026-01-01T00:00:00Z',
};

const mockNavigate = jest.fn();
const mockOnSave = jest.fn();
const mockOnDelete = jest.fn();
const mockOnRefresh = jest.fn();
const mockOnStartAgent = jest.fn();
const mockOnStopAgent = jest.fn();

type DevfileDetailsProps = React.ComponentProps<typeof DevfileDetails>;

function renderComponent(overrides?: Partial<DevfileDetailsProps>) {
  return render(
    <DevfileDetails
      devfile={mockDevfile}
      devfileSchema={undefined}
      namespace="test-namespace"
      navigate={mockNavigate}
      onSave={mockOnSave}
      onDelete={mockOnDelete}
      onRefresh={mockOnRefresh}
      onStartAgent={mockOnStartAgent}
      onStopAgent={mockOnStopAgent}
      agentPodStatus={undefined}
      agentTerminalUrl={undefined}
      isDarkTheme={true}
      isLoading={false}
      agentEnabled={true}
      {...overrides}
    />,
  );
}

function rerenderWithProps(
  rerender: (ui: React.ReactElement) => void,
  overrides?: Partial<DevfileDetailsProps>,
) {
  rerender(
    <DevfileDetails
      devfile={mockDevfile}
      devfileSchema={undefined}
      namespace="test-namespace"
      navigate={mockNavigate}
      onSave={mockOnSave}
      onDelete={mockOnDelete}
      onRefresh={mockOnRefresh}
      onStartAgent={mockOnStartAgent}
      onStopAgent={mockOnStopAgent}
      agentPodStatus={undefined}
      agentTerminalUrl={undefined}
      isDarkTheme={true}
      isLoading={false}
      agentEnabled={true}
      {...overrides}
    />,
  );
}

describe('DevfileDetails', () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });

    class MockAppAlerts extends AppAlerts {
      showAlert(alert: AlertItem): void {
        mockShowAlert(alert);
      }
    }

    container.snapshot();
    container.rebind(AppAlerts).to(MockAppAlerts).inSingletonScope();
  });

  afterEach(() => {
    container.restore();
    Object.assign(navigator, { clipboard: originalClipboard });
  });

  test('renders devfile name in heading', () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: 'my-devfile', level: 1 })).toBeDefined();
  });

  test('renders editor panel', () => {
    renderComponent();
    expect(screen.getByTestId('editor-panel')).toBeDefined();
  });

  test('renders agent panel when agentEnabled is true', () => {
    renderComponent();
    expect(screen.getByTestId('agent-panel')).toBeDefined();
  });

  test('hides agent panel when agentEnabled is false', () => {
    renderComponent({ agentEnabled: false });
    expect(screen.queryByTestId('agent-panel')).toBeNull();
  });

  test('Save button is disabled when no changes', () => {
    renderComponent();
    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDisabled();
  });

  test('Create Workspace button is enabled when no unsaved changes', () => {
    renderComponent();
    const createButton = screen.getByRole('button', { name: /Create Workspace/i });
    expect(createButton).not.toBeDisabled();
  });

  test('Create Workspace button navigates with url parameter', async () => {
    renderComponent();
    const createButton = screen.getByRole('button', { name: /Create Workspace/i });
    await userEvent.click(createButton);

    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: '/create-workspace',
      search: expect.stringContaining('url='),
    });

    const callArg = mockNavigate.mock.calls[0][0] as { search: string };
    const params = new URLSearchParams(callArg.search);
    const url = params.get('url');
    expect(url).toContain('/dashboard/api/devfiles/namespace/test-namespace/test-uuid-123/raw');
  });

  test('Copy Link copies raw API URL', async () => {
    renderComponent();

    const actionsToggle = screen.getByLabelText('Devfile actions');
    await userEvent.click(actionsToggle);

    const copyLink = screen.getByText('Copy Link');
    await userEvent.click(copyLink);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('/dashboard/api/devfiles/namespace/test-namespace/test-uuid-123/raw'),
    );
  });

  test('Delete opens confirmation dialog and calls onDelete after confirm', async () => {
    renderComponent();

    const actionsToggle = screen.getByLabelText('Devfile actions');
    await userEvent.click(actionsToggle);

    const dropdownDeleteItem = screen.getByRole('menuitem', { name: /Delete/i });
    await userEvent.click(dropdownDeleteItem);

    expect(mockOnDelete).not.toHaveBeenCalled();

    expect(screen.getByText(/Would you like to delete devfile "my-devfile"\?/)).toBeDefined();

    const checkbox = screen.getByTestId('confirmation-checkbox');
    await userEvent.click(checkbox);

    const confirmButton = screen.getByTestId('delete-devfile-button');
    await userEvent.click(confirmButton);

    expect(mockOnDelete).toHaveBeenCalledWith('test-uuid-123');
  });

  test('Delete confirmation can be cancelled', async () => {
    renderComponent();

    const actionsToggle = screen.getByLabelText('Devfile actions');
    await userEvent.click(actionsToggle);

    const dropdownDeleteItem = screen.getByRole('menuitem', { name: /Delete/i });
    await userEvent.click(dropdownDeleteItem);

    const closeButton = screen.getByTestId('close-button');
    await userEvent.click(closeButton);

    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  test('Refresh button calls onRefresh and resets editor content', async () => {
    renderComponent();

    // Make a change first
    const changeButton = screen.getByRole('button', { name: 'Change Editor' });
    await userEvent.click(changeButton);

    expect(screen.getByTestId('editor-content').textContent).toBe('changed-content');

    // Then refresh
    const refreshButton = screen.getByRole('button', { name: 'Refresh' });
    await userEvent.click(refreshButton);

    expect(screen.getByTestId('editor-content').textContent).toBe(mockDevfile.content);
    expect(screen.getByTestId('editor-is-saved').textContent).toBe('true');
    expect(mockOnRefresh).toHaveBeenCalled();
  });

  test('shows Start Agent button when no agent pod status', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /Start Agent/i })).toBeDefined();
  });

  describe('editor interactions', () => {
    test('handleEditorChange updates content and marks as unsaved', async () => {
      renderComponent();

      const changeButton = screen.getByRole('button', { name: 'Change Editor' });
      await userEvent.click(changeButton);

      expect(screen.getByTestId('editor-is-saved').textContent).toBe('false');
      expect(screen.getByTestId('editor-content').textContent).toBe('changed-content');
    });

    test('handleValidation sets hasValidationError to true on error', async () => {
      renderComponent();

      const validateErrorButton = screen.getByRole('button', { name: 'Validate Error' });
      await userEvent.click(validateErrorButton);

      expect(screen.getByTestId('editor-has-validation-error').textContent).toBe('true');
    });

    test('handleValidation clears hasValidationError when error is empty', async () => {
      renderComponent();

      const validateErrorButton = screen.getByRole('button', { name: 'Validate Error' });
      await userEvent.click(validateErrorButton);
      expect(screen.getByTestId('editor-has-validation-error').textContent).toBe('true');

      const validateOkButton = screen.getByRole('button', { name: 'Validate OK' });
      await userEvent.click(validateOkButton);
      expect(screen.getByTestId('editor-has-validation-error').textContent).toBe('false');
    });

    test('handleEditorExpandToggle toggles editor expanded state', async () => {
      renderComponent();

      expect(screen.getByTestId('editor-is-expanded').textContent).toBe('false');

      const toggleButton = screen.getByRole('button', { name: 'Toggle Expand' });
      await userEvent.click(toggleButton);
      expect(screen.getByTestId('editor-is-expanded').textContent).toBe('true');

      await userEvent.click(toggleButton);
      expect(screen.getByTestId('editor-is-expanded').textContent).toBe('false');
    });

    test('handleTerminalExpandToggle toggles terminal expanded state', async () => {
      renderComponent();

      expect(screen.getByTestId('agent-is-terminal-expanded').textContent).toBe('false');

      const toggleButton = screen.getByRole('button', { name: 'Toggle Terminal' });
      await userEvent.click(toggleButton);
      expect(screen.getByTestId('agent-is-terminal-expanded').textContent).toBe('true');

      await userEvent.click(toggleButton);
      expect(screen.getByTestId('agent-is-terminal-expanded').textContent).toBe('false');
    });

    test('handleEditorFocusChange sets editor focus state', async () => {
      renderComponent();

      const focusButton = screen.getByRole('button', { name: 'Focus Editor' });
      await userEvent.click(focusButton);

      // Editor should still be rendered
      expect(screen.getByTestId('editor-panel')).toBeDefined();
    });

    test('blurring editor resets content when saved and devfile content differs', async () => {
      const { rerender } = render(
        <DevfileDetails
          devfile={mockDevfile}
          devfileSchema={undefined}
          namespace="test-namespace"
          navigate={mockNavigate}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onRefresh={mockOnRefresh}
          onStartAgent={mockOnStartAgent}
          onStopAgent={mockOnStopAgent}
          agentPodStatus={undefined}
          agentTerminalUrl={undefined}
          isDarkTheme={true}
          isLoading={false}
          agentEnabled={true}
        />,
      );

      // Focus the editor
      const focusButton = screen.getByRole('button', { name: 'Focus Editor' });
      await userEvent.click(focusButton);

      // Update devfile content from props while editor is focused
      const updatedDevfile: LocalDevfile = {
        ...mockDevfile,
        content: 'schemaVersion: 2.2.2\nmetadata:\n  name: updated\n',
      };

      rerenderWithProps(rerender, { devfile: updatedDevfile });

      // Blur the editor - since isSaved is true, it should reset to devfile content
      const blurButton = screen.getByRole('button', { name: 'Blur Editor' });
      await userEvent.click(blurButton);

      expect(screen.getByTestId('editor-content').textContent).toBe(updatedDevfile.content);
    });
  });

  describe('handleSave', () => {
    test('successful save shows success alert', async () => {
      mockOnSave.mockResolvedValue(undefined);
      renderComponent();

      // Make a change first
      const changeButton = screen.getByRole('button', { name: 'Change Editor' });
      await userEvent.click(changeButton);

      const saveButton = screen.getByRole('button', { name: 'Save' });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('test-uuid-123', 'changed-content');
      });

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(
          expect.objectContaining({
            key: 'devfile-save-success',
            title: 'Devfile has been saved',
            variant: 'success',
          }),
        );
      });
    });

    test('failed save shows error alert with Error message', async () => {
      mockOnSave.mockRejectedValue(new Error('Network error'));
      renderComponent();

      const changeButton = screen.getByRole('button', { name: 'Change Editor' });
      await userEvent.click(changeButton);

      const saveButton = screen.getByRole('button', { name: 'Save' });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(
          expect.objectContaining({
            key: 'devfile-save-error',
            title: 'Network error',
            variant: 'danger',
          }),
        );
      });
    });

    test('failed save shows default message for non-Error thrown value', async () => {
      mockOnSave.mockRejectedValue('unknown error');
      renderComponent();

      const changeButton = screen.getByRole('button', { name: 'Change Editor' });
      await userEvent.click(changeButton);

      const saveButton = screen.getByRole('button', { name: 'Save' });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(
          expect.objectContaining({
            key: 'devfile-save-error',
            title: 'Save failed',
            variant: 'danger',
          }),
        );
      });
    });
  });

  describe('handleDownload', () => {
    test('creates and clicks download link', async () => {
      const mockClick = jest.fn();
      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = jest
        .spyOn(document, 'createElement')
        .mockImplementation((tagName: string, options?: ElementCreationOptions) => {
          if (tagName === 'a') {
            const el = originalCreateElement('a', options);
            el.click = mockClick;
            return el;
          }
          return originalCreateElement(tagName, options);
        });

      const mockCreateObjectURL = jest.fn().mockReturnValue('blob:test-url');
      const mockRevokeObjectURL = jest.fn();
      const originalURL = window.URL;
      Object.defineProperty(window, 'URL', {
        value: {
          ...originalURL,
          createObjectURL: mockCreateObjectURL,
          revokeObjectURL: mockRevokeObjectURL,
        },
        writable: true,
        configurable: true,
      });

      renderComponent();

      const actionsToggle = screen.getByLabelText('Devfile actions');
      await userEvent.click(actionsToggle);

      const downloadButton = screen.getByText('Download');
      await userEvent.click(downloadButton);

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url');

      createElementSpy.mockRestore();
      Object.defineProperty(window, 'URL', {
        value: originalURL,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('componentDidUpdate', () => {
    test('resets state when devfile id changes', () => {
      const { rerender } = renderComponent();

      const newDevfile: LocalDevfile = {
        id: 'new-uuid-456',
        name: 'new-devfile',
        description: 'New devfile',
        content: 'schemaVersion: 2.2.2\nmetadata:\n  name: new-devfile\n',
        projectNames: [],
        lastModified: '2026-02-01T00:00:00Z',
      };

      rerenderWithProps(rerender, { devfile: newDevfile });

      expect(screen.getByTestId('editor-content').textContent).toBe(newDevfile.content);
      expect(screen.getByTestId('editor-is-saved').textContent).toBe('true');
      expect(screen.getByTestId('editor-has-validation-error').textContent).toBe('false');
    });

    test('updates editor content when devfile content changes and editor not focused', () => {
      const { rerender } = renderComponent();

      const updatedDevfile: LocalDevfile = {
        ...mockDevfile,
        content: 'schemaVersion: 2.2.2\nmetadata:\n  name: updated-name\n',
      };

      rerenderWithProps(rerender, { devfile: updatedDevfile });

      expect(screen.getByTestId('editor-content').textContent).toBe(updatedDevfile.content);
    });

    test('does not update editor content when editor is focused', async () => {
      const { rerender } = renderComponent();

      // Focus the editor
      const focusButton = screen.getByRole('button', { name: 'Focus Editor' });
      await userEvent.click(focusButton);

      const updatedDevfile: LocalDevfile = {
        ...mockDevfile,
        content: 'schemaVersion: 2.2.2\nmetadata:\n  name: should-not-update\n',
      };

      rerenderWithProps(rerender, { devfile: updatedDevfile });

      // Content should not have been updated because the editor is focused
      expect(screen.getByTestId('editor-content').textContent).toBe(mockDevfile.content);
    });

    test('does not update editor content when content is unsaved', async () => {
      const { rerender } = renderComponent();

      // Make a change to mark as unsaved
      const changeButton = screen.getByRole('button', { name: 'Change Editor' });
      await userEvent.click(changeButton);

      const updatedDevfile: LocalDevfile = {
        ...mockDevfile,
        content: 'schemaVersion: 2.2.2\nmetadata:\n  name: should-not-update\n',
      };

      rerenderWithProps(rerender, { devfile: updatedDevfile });

      // Content should remain the user's edit
      expect(screen.getByTestId('editor-content').textContent).toBe('changed-content');
    });

    test('does not update editor content when YAML is semantically equal', () => {
      const { rerender } = renderComponent();

      // Same YAML with slightly different formatting (quoted string)
      const updatedDevfile: LocalDevfile = {
        ...mockDevfile,
        content: "schemaVersion: '2.2.2'\nmetadata:\n  name: my-devfile\n",
      };

      rerenderWithProps(rerender, { devfile: updatedDevfile });

      // Content should remain unchanged since YAML is semantically the same
      expect(screen.getByTestId('editor-content').textContent).toBe(mockDevfile.content);
    });
  });

  describe('drawer panel behavior', () => {
    const runningAgentPodStatus: AgentPodStatus = {
      agentId: 'agent-1',
      name: 'agent-pod',
      phase: AgentPodPhase.RUNNING,
      ready: true,
      serviceUrl: 'http://agent-service',
    };

    test('hides editor when terminal is expanded with connected agent', async () => {
      renderComponent({
        agentPodStatus: runningAgentPodStatus,
        agentTerminalUrl: 'http://terminal-url',
      });

      const toggleTerminalButton = screen.getByRole('button', { name: 'Toggle Terminal' });
      await userEvent.click(toggleTerminalButton);

      // When terminal is expanded with a connected agent, the editor wrapper
      // should not be rendered
      expect(screen.queryByTestId('editor-panel')).toBeNull();
    });

    test('shows editor when agent is not connected even if terminal is expanded', async () => {
      renderComponent({
        agentPodStatus: undefined,
        agentTerminalUrl: undefined,
      });

      const toggleTerminalButton = screen.getByRole('button', { name: 'Toggle Terminal' });
      await userEvent.click(toggleTerminalButton);

      // Without a connected agent, the editor should still be shown
      expect(screen.getByTestId('editor-panel')).toBeDefined();
    });

    test('editor expand toggle changes expanded state', async () => {
      renderComponent({
        agentPodStatus: runningAgentPodStatus,
        agentTerminalUrl: 'http://terminal-url',
      });

      expect(screen.getByTestId('editor-is-expanded').textContent).toBe('false');

      const toggleButton = screen.getByRole('button', { name: 'Toggle Expand' });
      await userEvent.click(toggleButton);

      expect(screen.getByTestId('editor-is-expanded').textContent).toBe('true');
    });
  });

  describe('isContentEqual edge cases', () => {
    test('handles invalid YAML gracefully by treating content as different', () => {
      const devfileWithInvalidContent: LocalDevfile = {
        ...mockDevfile,
        content: 'invalid: [yaml: content',
      };

      const { rerender } = renderComponent({ devfile: devfileWithInvalidContent });

      const updatedDevfile: LocalDevfile = {
        ...mockDevfile,
        content: 'also invalid: [yaml: different',
      };

      // Should not throw even with invalid YAML
      rerenderWithProps(rerender, { devfile: updatedDevfile });

      expect(screen.getByTestId('editor-content').textContent).toBe(updatedDevfile.content);
    });
  });
});
