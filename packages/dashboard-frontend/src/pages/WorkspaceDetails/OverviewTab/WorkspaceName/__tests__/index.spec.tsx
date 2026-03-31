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

const mockOnSave = jest.fn();

describe('WorkspaceNameFormGroup', () => {
  let storeBuilder: MockStoreBuilder;
  let devWorkspace: devfileApi.DevWorkspace;
  let workspace: Workspace;

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
    test('readonly — with cluster console link', () => {
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
      const snapshot = createSnapshot(store, workspace, true);
      expect(snapshot.toJSON()).toMatchSnapshot();
    });

    test('readonly — without cluster console link', () => {
      const store = storeBuilder.build();
      const snapshot = createSnapshot(store, workspace, true);
      expect(snapshot.toJSON()).toMatchSnapshot();
    });

    test('editable', () => {
      const store = storeBuilder.build();
      const snapshot = createSnapshot(store, workspace, false);
      expect(snapshot.toJSON()).toMatchSnapshot();
    });
  });

  describe('edit modal', () => {
    test('opens on pencil click', async () => {
      const store = storeBuilder.build();
      renderComponent(store, workspace, false);

      expect(screen.queryByTestId('edit-workspace-name-input')).toBeNull();

      await userEvent.click(screen.getByTestId('edit-workspace-name-button'));

      expect(screen.getByTestId('edit-workspace-name-input')).toBeInTheDocument();
    });

    test('Save is disabled when name unchanged', async () => {
      const store = storeBuilder.build();
      renderComponent(store, workspace, false);

      await userEvent.click(screen.getByTestId('edit-workspace-name-button'));

      expect(screen.getByTestId('edit-workspace-name-save')).toBeDisabled();
    });

    test('Save is enabled after name change', async () => {
      const store = storeBuilder.build();
      renderComponent(store, workspace, false);

      await userEvent.click(screen.getByTestId('edit-workspace-name-button'));
      const input = screen.getByTestId('edit-workspace-name-input');
      await userEvent.clear(input);
      await userEvent.type(input, 'new-name');

      expect(screen.getByTestId('edit-workspace-name-save')).not.toBeDisabled();
    });

    test('calls onSave with trimmed name', async () => {
      const store = storeBuilder.build();
      renderComponent(store, workspace, false);

      await userEvent.click(screen.getByTestId('edit-workspace-name-button'));
      const input = screen.getByTestId('edit-workspace-name-input');
      await userEvent.clear(input);
      await userEvent.type(input, 'new-name');
      await userEvent.click(screen.getByTestId('edit-workspace-name-save'));

      await waitFor(() => expect(mockOnSave).toHaveBeenCalledWith('new-name'));
    });

    test('Cancel closes without saving', async () => {
      const store = storeBuilder.build();
      renderComponent(store, workspace, false);

      await userEvent.click(screen.getByTestId('edit-workspace-name-button'));
      await userEvent.click(screen.getByTestId('edit-workspace-name-cancel'));

      expect(mockOnSave).not.toHaveBeenCalled();
      expect(screen.queryByTestId('edit-workspace-name-input')).toBeNull();
    });

    test('Save is disabled for empty name', async () => {
      const store = storeBuilder.build();
      renderComponent(store, workspace, false);

      await userEvent.click(screen.getByTestId('edit-workspace-name-button'));
      const input = screen.getByTestId('edit-workspace-name-input');
      await userEvent.clear(input);

      expect(screen.getByTestId('edit-workspace-name-save')).toBeDisabled();
    });

    test('Save is disabled for existing name', async () => {
      const anotherDw = new DevWorkspaceBuilder().withName('taken-name').build();
      const store = storeBuilder
        .withDevWorkspaces({ workspaces: [devWorkspace, anotherDw] })
        .build();
      renderComponent(store, workspace, false);

      await userEvent.click(screen.getByTestId('edit-workspace-name-button'));
      const input = screen.getByTestId('edit-workspace-name-input');
      await userEvent.clear(input);
      await userEvent.type(input, 'taken-name');

      expect(screen.getByTestId('edit-workspace-name-save')).toBeDisabled();
    });

    test('Save is disabled for name exceeding max length', async () => {
      const store = storeBuilder.build();
      renderComponent(store, workspace, false);

      await userEvent.click(screen.getByTestId('edit-workspace-name-button'));
      const input = screen.getByTestId('edit-workspace-name-input');
      await userEvent.clear(input);
      await userEvent.type(input, 'a'.repeat(64));

      expect(screen.getByTestId('edit-workspace-name-save')).toBeDisabled();
    });

    test('shows tooltip error for name exceeding max length', async () => {
      const store = storeBuilder.build();
      renderComponent(store, workspace, false);

      await userEvent.click(screen.getByTestId('edit-workspace-name-button'));
      const input = screen.getByTestId('edit-workspace-name-input');
      await userEvent.clear(input);
      await userEvent.type(input, 'a'.repeat(64));

      // The tooltip error variant renders the truncated error text
      expect(screen.getByText('The name is not valid.')).toBeInTheDocument();
    });

    test('shows tooltip error for name with invalid characters', async () => {
      const store = storeBuilder.build();
      renderComponent(store, workspace, false);

      await userEvent.click(screen.getByTestId('edit-workspace-name-button'));
      const input = screen.getByTestId('edit-workspace-name-input');
      await userEvent.clear(input);
      await userEvent.type(input, 'invalid name!');

      expect(screen.getByText('The name is not valid.')).toBeInTheDocument();
    });

    test('pencil button not shown in readonly mode', () => {
      const store = storeBuilder.build();
      renderComponent(store, workspace, true);

      expect(screen.queryByTestId('edit-workspace-name-button')).toBeNull();
    });
  });
});

function getComponent(store: Store, workspace: Workspace, readonly: boolean) {
  return (
    <Provider store={store}>
      <WorkspaceNameFormGroup workspace={workspace} readonly={readonly} onSave={mockOnSave} />
    </Provider>
  );
}
