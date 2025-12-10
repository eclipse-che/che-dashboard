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

import { ApplicationId } from '@eclipse-che/common';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';
import { Store } from 'redux';

import WorkspaceNameFormGroup from '@/pages/WorkspaceDetails/OverviewTab/WorkspaceName';
import getComponentRenderer from '@/services/__mocks__/getComponentRenderer';
import devfileApi from '@/services/devfileApi';
import { constructWorkspace, Workspace } from '@/services/workspace-adapter';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

describe('WorkspaceNameFormGroup', () => {
  let storeBuilder: MockStoreBuilder;
  let devWorkspace: devfileApi.DevWorkspace;
  let workspace: Workspace;
  const mockOnSave = jest.fn();

  beforeEach(() => {
    devWorkspace = new DevWorkspaceBuilder().withName('my-project').build();
    workspace = constructWorkspace(devWorkspace);
    storeBuilder = new MockStoreBuilder().withDevWorkspaces({ workspaces: [devWorkspace] });
    mockOnSave.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('snapshots', () => {
    test('screenshot when cluster console is available', () => {
      const store = storeBuilder
        .withClusterInfo({
          applications: [
            {
              id: ApplicationId.CLUSTER_CONSOLE,
              title: 'Cluster Console',
              url: 'https://console-openshift-console.apps-crc.testing',
              icon: 'icon',
            },
          ],
        })
        .build();
      const snapshot = createSnapshot(store, workspace, true, mockOnSave);
      expect(snapshot.toJSON()).toMatchSnapshot();
    });

    test('screenshot when cluster console is NOT available', () => {
      const store = storeBuilder.build();
      const snapshot = createSnapshot(store, workspace, true, mockOnSave);
      expect(snapshot.toJSON()).toMatchSnapshot();
    });

    test('screenshot in readonly mode', () => {
      const store = storeBuilder.build();
      const snapshot = createSnapshot(store, workspace, true, mockOnSave);
      expect(snapshot.toJSON()).toMatchSnapshot();
    });

    test('screenshot in editable mode', () => {
      const store = storeBuilder.build();
      const snapshot = createSnapshot(store, workspace, false, mockOnSave);
      expect(snapshot.toJSON()).toMatchSnapshot();
    });
  });

  describe('editing functionality', () => {
    test('should open edit modal when pencil icon is clicked', async () => {
      const user = userEvent.setup();
      const store = storeBuilder.build();
      renderComponent(store, workspace, false, mockOnSave);

      const editButton = screen.getByTestId('edit-workspace-name-button');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Workspace Name')).toBeInTheDocument();
      });
    });

    test('should not show edit button in readonly mode', () => {
      const store = storeBuilder.build();
      renderComponent(store, workspace, true, mockOnSave);

      expect(screen.queryByTestId('edit-workspace-name-button')).not.toBeInTheDocument();
    });

    test('should close modal when cancel is clicked', async () => {
      const user = userEvent.setup();
      const store = storeBuilder.build();
      renderComponent(store, workspace, false, mockOnSave);

      // Open modal
      const editButton = screen.getByTestId('edit-workspace-name-button');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Workspace Name')).toBeInTheDocument();
      });

      // Cancel
      const cancelButton = screen.getByTestId('edit-workspace-name-cancel');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Edit Workspace Name')).not.toBeInTheDocument();
      });
    });

    test('should save new name when save is clicked', async () => {
      const user = userEvent.setup();
      const store = storeBuilder.build();
      renderComponent(store, workspace, false, mockOnSave);

      // Open modal
      const editButton = screen.getByTestId('edit-workspace-name-button');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByTestId('edit-workspace-name-input')).toBeInTheDocument();
      });

      // Change name
      const input = screen.getByTestId('edit-workspace-name-input');
      await user.clear(input);
      await user.type(input, 'new-workspace-name');

      // Save
      const saveButton = screen.getByTestId('edit-workspace-name-save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('new-workspace-name');
      });
    });

    test('should save valid workspace name', async () => {
      const user = userEvent.setup();
      const store = storeBuilder.build();
      renderComponent(store, workspace, false, mockOnSave);

      // Open modal
      const editButton = screen.getByTestId('edit-workspace-name-button');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByTestId('edit-workspace-name-input')).toBeInTheDocument();
      });

      // Change name to a valid name
      const input = screen.getByTestId('edit-workspace-name-input');
      await user.clear(input);
      await user.type(input, 'valid-new-name');

      // Save
      const saveButton = screen.getByTestId('edit-workspace-name-save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('valid-new-name');
      });
    });
  });

  describe('validation', () => {
    test('should show error when name is empty', async () => {
      const user = userEvent.setup();
      const store = storeBuilder.build();
      renderComponent(store, workspace, false, mockOnSave);

      // Open modal
      const editButton = screen.getByTestId('edit-workspace-name-button');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByTestId('edit-workspace-name-input')).toBeInTheDocument();
      });

      // Clear name
      const input = screen.getByTestId('edit-workspace-name-input');
      await user.clear(input);

      await waitFor(() => {
        expect(screen.getByText('The name cannot be empty.')).toBeInTheDocument();
      });

      // Save button should be disabled
      const saveButton = screen.getByTestId('edit-workspace-name-save');
      expect(saveButton).toBeDisabled();
    });

    test('should show error when name exceeds 63 characters', async () => {
      const user = userEvent.setup();
      const store = storeBuilder.build();
      renderComponent(store, workspace, false, mockOnSave);

      // Open modal
      const editButton = screen.getByTestId('edit-workspace-name-button');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByTestId('edit-workspace-name-input')).toBeInTheDocument();
      });

      // Enter long name
      const input = screen.getByTestId('edit-workspace-name-input');
      await user.clear(input);
      await user.type(input, 'a'.repeat(64));

      await waitFor(() => {
        expect(screen.getByText('The name is not valid.')).toBeInTheDocument();
      });

      // Save button should be disabled
      const saveButton = screen.getByTestId('edit-workspace-name-save');
      expect(saveButton).toBeDisabled();
    });

    test('should show error for invalid characters', async () => {
      const user = userEvent.setup();
      const store = storeBuilder.build();
      renderComponent(store, workspace, false, mockOnSave);

      // Open modal
      const editButton = screen.getByTestId('edit-workspace-name-button');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByTestId('edit-workspace-name-input')).toBeInTheDocument();
      });

      // Enter invalid name
      const input = screen.getByTestId('edit-workspace-name-input');
      await user.clear(input);
      await user.type(input, 'invalid name!');

      await waitFor(() => {
        expect(screen.getByText('The name is not valid.')).toBeInTheDocument();
      });

      // Save button should be disabled
      const saveButton = screen.getByTestId('edit-workspace-name-save');
      expect(saveButton).toBeDisabled();
    });

    test('should show error when name already exists', async () => {
      const user = userEvent.setup();

      // Create another workspace with a different name
      const existingDevWorkspace = new DevWorkspaceBuilder()
        .withName('existing-workspace')
        .withUID('different-uid')
        .build();

      const store = new MockStoreBuilder()
        .withDevWorkspaces({ workspaces: [devWorkspace, existingDevWorkspace] })
        .build();

      renderComponent(store, workspace, false, mockOnSave);

      // Open modal
      const editButton = screen.getByTestId('edit-workspace-name-button');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByTestId('edit-workspace-name-input')).toBeInTheDocument();
      });

      // Try to use existing name
      const input = screen.getByTestId('edit-workspace-name-input');
      await user.clear(input);
      await user.type(input, 'existing-workspace');

      await waitFor(() => {
        expect(screen.getByText('The name is already in use.')).toBeInTheDocument();
      });

      // Save button should be disabled
      const saveButton = screen.getByTestId('edit-workspace-name-save');
      expect(saveButton).toBeDisabled();
    });

    test('should allow valid name changes', async () => {
      const user = userEvent.setup();
      const store = storeBuilder.build();
      renderComponent(store, workspace, false, mockOnSave);

      // Open modal
      const editButton = screen.getByTestId('edit-workspace-name-button');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByTestId('edit-workspace-name-input')).toBeInTheDocument();
      });

      // Enter valid name
      const input = screen.getByTestId('edit-workspace-name-input');
      await user.clear(input);
      await user.type(input, 'valid-workspace-123');

      await waitFor(() => {
        // Should not show error
        expect(screen.queryByText('The name is not valid.')).not.toBeInTheDocument();
        expect(screen.queryByText('The name cannot be empty.')).not.toBeInTheDocument();
        expect(screen.queryByText('The name is already in use.')).not.toBeInTheDocument();
      });

      // Save button should be enabled
      const saveButton = screen.getByTestId('edit-workspace-name-save');
      expect(saveButton).not.toBeDisabled();
    });

    test('should disable save button when name is unchanged', async () => {
      const user = userEvent.setup();
      const store = storeBuilder.build();
      renderComponent(store, workspace, false, mockOnSave);

      // Open modal
      const editButton = screen.getByTestId('edit-workspace-name-button');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByTestId('edit-workspace-name-input')).toBeInTheDocument();
      });

      // Name is initially set to current workspace name
      // Save button should be disabled because name hasn't changed
      const saveButton = screen.getByTestId('edit-workspace-name-save');
      expect(saveButton).toBeDisabled();
    });

    test('should accept names with hyphens, underscores, and dots', async () => {
      const user = userEvent.setup();
      const store = storeBuilder.build();
      renderComponent(store, workspace, false, mockOnSave);

      // Open modal
      const editButton = screen.getByTestId('edit-workspace-name-button');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByTestId('edit-workspace-name-input')).toBeInTheDocument();
      });

      // Enter valid name with special characters
      const input = screen.getByTestId('edit-workspace-name-input');
      await user.clear(input);
      await user.type(input, 'workspace-name_123.test');

      await waitFor(() => {
        expect(screen.queryByText('The name is not valid.')).not.toBeInTheDocument();
      });

      // Save button should be enabled
      const saveButton = screen.getByTestId('edit-workspace-name-save');
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('cluster console link', () => {
    test('should display link when cluster console is available', () => {
      const store = storeBuilder
        .withClusterInfo({
          applications: [
            {
              id: ApplicationId.CLUSTER_CONSOLE,
              title: 'Cluster Console',
              url: 'https://console-openshift-console.apps-crc.testing',
              icon: 'icon',
            },
          ],
        })
        .build();
      renderComponent(store, workspace, false, mockOnSave);

      const link = screen.getByRole('link', { name: workspace.name });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('target', '_blank');
    });

    test('should display plain text when cluster console is not available', () => {
      const store = storeBuilder.build();
      renderComponent(store, workspace, false, mockOnSave);

      // Should not be a link
      expect(screen.queryByRole('link', { name: workspace.name })).not.toBeInTheDocument();
    });
  });
});

function getComponent(
  store: Store,
  workspace: Workspace,
  readonly: boolean,
  onSave: (workspaceName: string) => void,
) {
  return (
    <Provider store={store}>
      <WorkspaceNameFormGroup workspace={workspace} readonly={readonly} onSave={onSave} />
    </Provider>
  );
}
