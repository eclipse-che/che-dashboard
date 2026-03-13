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

import { BackupInfo, BackupStatus } from '@eclipse-che/common';
import React from 'react';

import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';
import { constructWorkspace, Workspace } from '@/services/workspace-adapter';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';

import { BackupTab } from '..';

jest.mock('@/pages/WorkspaceDetails/BackupTab/Info', () => ({
  BackupTabInfo: () => <div data-testid="backup-tab-info" />,
}));

const mockFetchBackupStatus = jest.fn();

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

describe('BackupTab', () => {
  let workspace: Workspace;

  beforeEach(() => {
    const devWorkspace = new DevWorkspaceBuilder()
      .withName('my-workspace')
      .withNamespace('user-namespace')
      .withUID('test-uid-123')
      .build();
    workspace = constructWorkspace(devWorkspace);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('data fetching', () => {
    test('should fetch backup status on mount', () => {
      renderComponent(workspace);

      expect(mockFetchBackupStatus).toHaveBeenCalledWith({
        namespace: workspace.namespace,
        workspaceUID: workspace.uid,
        workspaceName: workspace.name,
      });
    });

    test('should re-fetch when workspace UID changes', () => {
      const { reRenderComponent } = renderComponent(workspace);

      expect(mockFetchBackupStatus).toHaveBeenCalledTimes(1);

      const newDevWorkspace = new DevWorkspaceBuilder()
        .withName('other-workspace')
        .withNamespace('user-namespace')
        .withUID('different-uid-456')
        .build();
      const newWorkspace = constructWorkspace(newDevWorkspace);

      reRenderComponent(newWorkspace);

      expect(mockFetchBackupStatus).toHaveBeenCalledTimes(2);
      expect(mockFetchBackupStatus).toHaveBeenLastCalledWith({
        namespace: newWorkspace.namespace,
        workspaceUID: newWorkspace.uid,
        workspaceName: newWorkspace.name,
      });
    });

    test('should not re-fetch when workspace UID stays the same', () => {
      const { reRenderComponent } = renderComponent(workspace);

      expect(mockFetchBackupStatus).toHaveBeenCalledTimes(1);

      reRenderComponent(workspace, { isLoading: true });

      expect(mockFetchBackupStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('loading state', () => {
    test('should show spinner when loading with no backup data', () => {
      renderComponent(workspace, { isLoading: true });

      expect(screen.getByLabelText('Loading backup information')).toBeInTheDocument();
    });

    test('should show backup info even when loading with existing data', () => {
      const backupInfo: BackupInfo = {
        status: BackupStatus.SUCCESS,
        lastBackupTime: '2026-02-11T12:30:00Z',
      };

      renderComponent(workspace, { backupInfo, isLoading: true });

      expect(screen.queryByLabelText('Loading backup information')).not.toBeInTheDocument();
      expect(screen.getByTestId('backup-tab-info')).toBeInTheDocument();
    });

    test('snapshot - loading', () => {
      const snapshot = createSnapshot(workspace, { isLoading: true });
      expect(snapshot.toJSON()).toMatchSnapshot();
    });
  });

  describe('error state', () => {
    test('should show error alert', () => {
      renderComponent(workspace, { error: 'Network error occurred' });

      expect(screen.getByText('Failed to load backup information')).toBeInTheDocument();
      expect(screen.getByText('Network error occurred')).toBeInTheDocument();
    });

    test('snapshot - error', () => {
      const snapshot = createSnapshot(workspace, { error: 'Network error occurred' });
      expect(snapshot.toJSON()).toMatchSnapshot();
    });
  });

  describe('no backup info', () => {
    test('should show info alert when no backup data exists', () => {
      renderComponent(workspace);

      expect(screen.getByText('No backup information available')).toBeInTheDocument();
      expect(
        screen.getByText('Backup data for this workspace has not been recorded yet.'),
      ).toBeInTheDocument();
    });

    test('should display informational description', () => {
      renderComponent(workspace);

      expect(
        screen.getByText(/Backups are created automatically by the DevWorkspace Operator/),
      ).toBeInTheDocument();
    });

    test('snapshot - no backup info', () => {
      const snapshot = createSnapshot(workspace);
      expect(snapshot.toJSON()).toMatchSnapshot();
    });
  });

  describe('with backup info', () => {
    test('should render BackupTabInfo component', () => {
      const backupInfo: BackupInfo = {
        status: BackupStatus.SUCCESS,
        lastBackupTime: '2026-02-11T12:30:00Z',
      };

      renderComponent(workspace, { backupInfo });

      expect(screen.getByTestId('backup-tab-info')).toBeInTheDocument();
    });
  });
});

function getComponent(
  workspace: Workspace,
  options: {
    backupInfo?: BackupInfo;
    isLoading?: boolean;
    error?: string;
  } = {},
) {
  return (
    <BackupTab
      workspace={workspace}
      backupInfo={options.backupInfo}
      isLoading={options.isLoading || false}
      error={options.error}
      fetchWorkspaceBackupStatus={mockFetchBackupStatus}
    />
  );
}
