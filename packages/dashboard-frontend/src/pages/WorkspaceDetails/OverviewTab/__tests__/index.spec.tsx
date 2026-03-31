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

import userEvent from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';

import { OverviewTab } from '@/pages/WorkspaceDetails/OverviewTab';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';
import { DevWorkspaceStatus } from '@/services/helpers/types';
import { constructWorkspace, Workspace } from '@/services/workspace-adapter';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';

jest.mock('@/pages/WorkspaceDetails/OverviewTab/InfrastructureNamespace');
jest.mock('@/pages/WorkspaceDetails/OverviewTab/Projects');
jest.mock('@/pages/WorkspaceDetails/OverviewTab/StorageType');
jest.mock('@/pages/WorkspaceDetails/OverviewTab/WorkspaceName');
jest.mock('@/pages/WorkspaceDetails/OverviewTab/GitRepo');

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

const mockFetchParentDevfile = jest.fn();
jest.mock('@/services/backend-client/parentDevfileApi', () => {
  return {
    getParentDevfile: async (href: string) => {
      return mockFetchParentDevfile(href);
    },
  };
});

const mockOnSave = jest.fn();

describe('OverviewTab', () => {
  let workspace: Workspace;

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('With parent', () => {
    // mute the outputs
    console.error = jest.fn();
    beforeEach(() => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withName('my-project')
        .withTemplate({
          parent: {
            uri: 'https://dummy-registry/devfile.yaml',
          },
        })
        .build();
      workspace = constructWorkspace(devWorkspace);

      mockFetchParentDevfile.mockResolvedValueOnce({
        schemaVersion: '2.2.2',
        attributes: {
          'controller.devfile.io/storage-type': 'ephemeral',
        },
      });
    });

    test('screenshot', () => {
      const snapshot = createSnapshot(workspace);
      expect(snapshot.toJSON()).toMatchSnapshot();
    });

    test('change storage type', async () => {
      renderComponent(workspace);
      expect(mockFetchParentDevfile).toHaveBeenCalled();
      expect(mockOnSave).not.toHaveBeenCalled();

      const changeStorageType = screen.getByRole('button', { name: 'Change storage type' });

      expect(changeStorageType).not.toBeDisabled();
    });
  });

  describe('Without parent', () => {
    beforeEach(() => {
      const devWorkspace = new DevWorkspaceBuilder().withName('my-project').build();
      workspace = constructWorkspace(devWorkspace);
    });

    test('screenshot', () => {
      const snapshot = createSnapshot(workspace);
      expect(snapshot.toJSON()).toMatchSnapshot();
    });

    test('change storage type', async () => {
      renderComponent(workspace);
      expect(mockFetchParentDevfile).not.toHaveBeenCalled();
      expect(mockOnSave).not.toHaveBeenCalled();

      const changeStorageType = screen.getByRole('button', { name: 'Change storage type' });

      expect(changeStorageType).not.toBeDisabled();

      await userEvent.click(changeStorageType);

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({ storageType: 'per-workspace' }),
      );
    });
  });

  /**
   * Regression guard: ensures workspace rename stays wired in OverviewTab.
   * This test will fail if readonly/onSave props are removed from WorkspaceNameFormGroup
   * (as happened in the PF6 redesign regression — eclipse-che/che-dashboard#1452).
   */
  describe('Workspace rename', () => {
    test('rename button is shown when workspace is STOPPED', async () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withName('my-project')
        .withStatus({ phase: 'STOPPED' })
        .build();
      workspace = constructWorkspace(devWorkspace);
      renderComponent(workspace);

      expect(screen.getByTestId('workspace-name-readonly')).toHaveTextContent('false');
      expect(screen.getByTestId('mock-rename-button')).toBeInTheDocument();
    });

    test('rename button is shown when workspace is FAILED', async () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withName('my-project')
        .withStatus({ phase: 'FAILED' })
        .build();
      workspace = constructWorkspace(devWorkspace);
      renderComponent(workspace);

      expect(screen.getByTestId('workspace-name-readonly')).toHaveTextContent('false');
      expect(screen.getByTestId('mock-rename-button')).toBeInTheDocument();
    });

    test('rename button is NOT shown when workspace is RUNNING', () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withName('my-project')
        .withStatus({ phase: 'RUNNING' })
        .build();
      workspace = constructWorkspace(devWorkspace);
      renderComponent(workspace);

      expect(screen.getByTestId('workspace-name-readonly')).toHaveTextContent('true');
      expect(screen.queryByTestId('mock-rename-button')).toBeNull();
    });

    test('rename button is NOT shown when workspace is TERMINATING', () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withName('my-project')
        .withStatus({ phase: DevWorkspaceStatus.TERMINATING })
        .build();
      workspace = constructWorkspace(devWorkspace);
      renderComponent(workspace);

      expect(screen.getByTestId('workspace-name-readonly')).toHaveTextContent('true');
      expect(screen.queryByTestId('mock-rename-button')).toBeNull();
    });

    test('clicking rename calls onSave — rename handler is wired from OverviewTab', async () => {
      // Regression guard: verifies that WorkspaceNameFormGroup.onSave is connected
      // to OverviewTab.handleWorkspaceNameSave, which in turn calls props.onSave.
      // This test will fail if the onSave wiring is removed (as happened in #1452).
      const devWorkspace = new DevWorkspaceBuilder()
        .withName('my-project')
        .withStatus({ phase: 'STOPPED' })
        .build();
      workspace = constructWorkspace(devWorkspace);
      renderComponent(workspace);

      await userEvent.click(screen.getByTestId('mock-rename-button'));

      // mockOnSave (OverviewTab's onSave prop) must have been called once,
      // proving the rename path is fully wired.
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });
  });
});

function getComponent(workspace: Workspace) {
  const store = new MockStoreBuilder().build();
  return (
    <Provider store={store}>
      <OverviewTab onSave={mockOnSave} workspace={workspace} />
    </Provider>
  );
}
