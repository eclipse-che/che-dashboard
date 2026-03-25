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

import { BackupItem, DEVWORKSPACE_BACKUP_ANNOTATIONS } from '@eclipse-che/common';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import { BackupsView } from '@/pages/WorkspacesList/BackupsView';

jest.mock('@/pages/WorkspacesList/BackupsView/BackupsTableView', () => ({
  BackupsTableView: () => <div data-testid="backups-table-view" />,
}));

jest.mock('@/pages/WorkspacesList/BackupsView/EmptyState', () => ({
  BackupsEmptyState: (props: { onRestoreClick: () => void }) => (
    <div data-testid="backups-empty-state">
      <button data-testid="restore-from-backup-button" onClick={props.onRestoreClick}>
        Restore Workspace
      </button>
    </div>
  ),
}));

const mockNavigate = jest.fn();
const mockFetchBackupList = jest.fn();
const mockFetchBackupConfig = jest.fn();

const mockBackups: BackupItem[] = [
  {
    workspaceName: 'my-workspace',
    imageUrl: 'image-registry.svc:5000/namespace/my-workspace:latest',
    timestamp: '2025-01-15T14:30:00Z',
    sizeBytes: 1048576,
    workspaceExists: true,
    labels: {
      [DEVWORKSPACE_BACKUP_ANNOTATIONS.LAST_BACKUP_SUCCESSFUL]: 'true',
    },
  },
];

function getDefaultProps() {
  return {
    namespace: 'test-namespace',
    backups: [] as BackupItem[],
    isLoading: false,
    hasEverFetched: true,
    error: undefined as string | undefined,
    backupSchedule: undefined as string | undefined,
    navigate: mockNavigate,
    fetchBackupList: mockFetchBackupList,
    fetchBackupConfig: mockFetchBackupConfig,
  };
}

function renderComponent(propsOverrides: Partial<ReturnType<typeof getDefaultProps>> = {}) {
  const props = { ...getDefaultProps(), ...propsOverrides };
  return render(
    <MemoryRouter>
      <BackupsView {...(props as any)} />
    </MemoryRouter>,
  );
}

describe('BackupsView', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    test('should show spinner when loading', () => {
      renderComponent({ isLoading: true });

      expect(screen.getByTestId('backups-loading-spinner')).toBeTruthy();
    });

    test('should not show table when loading', () => {
      renderComponent({ isLoading: true });

      expect(screen.queryByTestId('backups-table-view')).toBeNull();
    });

    test('should show spinner when hasEverFetched is false', () => {
      renderComponent({ isLoading: false, hasEverFetched: false, backups: [] });

      expect(screen.getByTestId('backups-loading-spinner')).toBeTruthy();
      expect(screen.queryByTestId('backups-empty-state')).toBeNull();
    });
  });

  describe('empty state', () => {
    test('should show empty state when no backups', () => {
      renderComponent({ backups: [] });

      expect(screen.getByTestId('backups-empty-state')).toBeTruthy();
    });

    test('should not show table when no backups', () => {
      renderComponent({ backups: [] });

      expect(screen.queryByTestId('backups-table-view')).toBeNull();
    });
  });

  describe('error handling', () => {
    test('should display error message when error exists', () => {
      renderComponent({ backups: mockBackups, error: 'Failed to fetch backups' });

      const errorEl = screen.getByTestId('backups-error');
      expect(errorEl).toHaveTextContent('Failed to fetch backups');
    });

    test('should not display error when no error', () => {
      renderComponent({ backups: mockBackups });

      expect(screen.queryByTestId('backups-error')).toBeNull();
    });
  });

  describe('with backups', () => {
    test('should render BackupsTableView', () => {
      renderComponent({ backups: mockBackups });

      expect(screen.getByTestId('backups-table-view')).toBeTruthy();
    });
  });

  describe('lifecycle', () => {
    test('should fetch backup list on mount with force', () => {
      renderComponent({ namespace: 'test-namespace' });

      expect(mockFetchBackupList).toHaveBeenCalledWith({
        namespace: 'test-namespace',
        force: true,
      });
    });

    test('should fetch backup config on mount (uses TTL cache)', () => {
      renderComponent({ namespace: 'test-namespace' });

      expect(mockFetchBackupConfig).toHaveBeenCalledWith({
        namespace: 'test-namespace',
      });
    });

    test('should not fetch when namespace is empty', () => {
      renderComponent({ namespace: '' });

      expect(mockFetchBackupList).not.toHaveBeenCalled();
      expect(mockFetchBackupConfig).not.toHaveBeenCalled();
    });

    test('should re-fetch when namespace changes', () => {
      const { rerender } = render(
        <BackupsView
          {...({
            ...getDefaultProps(),
            namespace: 'namespace-1',
          } as any)}
        />,
      );

      expect(mockFetchBackupList).toHaveBeenCalledWith({ namespace: 'namespace-1', force: true });
      mockFetchBackupList.mockClear();

      rerender(
        <MemoryRouter>
          <BackupsView
            {...({
              ...getDefaultProps(),
              namespace: 'namespace-2',
            } as any)}
          />
        </MemoryRouter>,
      );

      expect(mockFetchBackupList).toHaveBeenCalledWith({ namespace: 'namespace-2', force: true });
    });

    test('should not re-fetch when namespace stays the same', () => {
      const { rerender } = render(
        <MemoryRouter>
          <BackupsView
            {...({
              ...getDefaultProps(),
              namespace: 'test-namespace',
            } as any)}
          />
        </MemoryRouter>,
      );

      mockFetchBackupList.mockClear();

      rerender(
        <MemoryRouter>
          <BackupsView
            {...({
              ...getDefaultProps(),
              namespace: 'test-namespace',
              backups: mockBackups,
            } as any)}
          />
        </MemoryRouter>,
      );

      expect(mockFetchBackupList).not.toHaveBeenCalled();
    });
  });
});
