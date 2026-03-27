/*
 * Copyright (c) 2018-2026 Red Hat, Inc.
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
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import { BackupsTableView } from '@/pages/WorkspacesList/BackupsView/BackupsTableView';

jest.mock('@/services/helpers/dates', () => ({
  formatDate: jest.fn(() => 'Jan 15, 2:30 pm'),
  formatRelativeDate: jest.fn(() => '2 hours ago'),
}));

jest.mock('cronstrue', () => ({
  __esModule: true,
  default: { toString: jest.fn(() => 'At 01:00 AM') },
}));

jest.mock('@/components/BackupStatusBadge', () => ({
  BackupStatusBadge: (props: {
    status: string;
    lastBackupTime?: string;
    backupImageUrl?: string;
  }) => (
    <span data-testid="backup-status-badge" data-status={props.status}>
      {props.status}
    </span>
  ),
}));

const mockNavigate = jest.fn();

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
  {
    workspaceName: 'deleted-workspace',
    imageUrl: 'image-registry.svc:5000/namespace/deleted-workspace:latest',
    timestamp: '2025-01-14T10:00:00Z',
    sizeBytes: 524288,
    workspaceExists: false,
    labels: {
      [DEVWORKSPACE_BACKUP_ANNOTATIONS.LAST_BACKUP_SUCCESSFUL]: 'false',
    },
  },
  {
    workspaceName: 'another-workspace',
    imageUrl: 'image-registry.svc:5000/namespace/another-workspace:latest',
    timestamp: '2025-01-16T08:00:00Z',
    sizeBytes: 2097152,
    workspaceExists: true,
    labels: {},
  },
];

function renderComponent(backups: BackupItem[] = mockBackups, backupSchedule?: string) {
  return render(
    <MemoryRouter>
      <BackupsTableView
        backups={backups}
        namespace="test-namespace"
        navigate={mockNavigate}
        backupSchedule={backupSchedule}
      />
    </MemoryRouter>,
  );
}

describe('BackupsTableView', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('table rendering', () => {
    test('should render table with backups', () => {
      renderComponent();

      const workspaceNames = screen.getAllByTestId('backup-workspace-name');
      expect(workspaceNames).toHaveLength(3);
    });

    test('should display workspace names', () => {
      renderComponent();

      expect(screen.getByText('my-workspace')).toBeTruthy();
      expect(screen.getByText('deleted-workspace')).toBeTruthy();
      expect(screen.getByText('another-workspace')).toBeTruthy();
    });

    test('should display relative backup time', () => {
      renderComponent();

      const times = screen.getAllByTestId('backup-time');
      expect(times).toHaveLength(3);
      times.forEach(time => {
        expect(time).toHaveTextContent('2 hours ago');
      });
    });

    test('should display Active label for existing workspaces', () => {
      renderComponent();

      const activeLabels = screen.getAllByTestId('backup-workspace-active');
      expect(activeLabels).toHaveLength(2);
      activeLabels.forEach(label => {
        expect(label).toHaveTextContent('Active');
      });
    });

    test('should display Deleted label for deleted workspaces', () => {
      renderComponent();

      const deletedLabels = screen.getAllByTestId('backup-workspace-deleted');
      expect(deletedLabels).toHaveLength(1);
      expect(deletedLabels[0]).toHaveTextContent('Deleted');
    });

    test('should render BackupStatusBadge with correct status based on labels', () => {
      renderComponent();

      const badges = screen.getAllByTestId('backup-status-badge');
      expect(badges).toHaveLength(3);
    });
  });

  describe('status derivation', () => {
    test('should derive NEVER status when backup annotation is missing', () => {
      const backup: BackupItem[] = [
        {
          workspaceName: 'no-labels-workspace',
          imageUrl: 'registry/no-labels:latest',
          timestamp: '2025-01-15T14:30:00Z',
          sizeBytes: 1024,
          workspaceExists: true,
          labels: {},
        },
      ];
      renderComponent(backup);

      const badge = screen.getByTestId('backup-status-badge');
      expect(badge).toHaveAttribute('data-status', 'never');
    });

    test('should derive SUCCESS status when backup annotation is true', () => {
      const backup: BackupItem[] = [
        {
          workspaceName: 'success-workspace',
          imageUrl: 'registry/success:latest',
          timestamp: '2025-01-15T14:30:00Z',
          sizeBytes: 1024,
          workspaceExists: true,
          labels: {
            [DEVWORKSPACE_BACKUP_ANNOTATIONS.LAST_BACKUP_SUCCESSFUL]: 'true',
          },
        },
      ];
      renderComponent(backup);

      const badge = screen.getByTestId('backup-status-badge');
      expect(badge).toHaveAttribute('data-status', 'success');
    });

    test('should derive FAILED status when backup annotation is false', () => {
      const backup: BackupItem[] = [
        {
          workspaceName: 'failed-workspace',
          imageUrl: 'registry/failed:latest',
          timestamp: '2025-01-15T14:30:00Z',
          sizeBytes: 1024,
          workspaceExists: true,
          labels: {
            [DEVWORKSPACE_BACKUP_ANNOTATIONS.LAST_BACKUP_SUCCESSFUL]: 'false',
          },
        },
      ];
      renderComponent(backup);

      const badge = screen.getByTestId('backup-status-badge');
      expect(badge).toHaveAttribute('data-status', 'failed');
    });
  });

  describe('filtering', () => {
    test('should render search input', () => {
      renderComponent();

      expect(screen.getByTestId('backups-filter-input')).toBeTruthy();
    });

    test('should not filter until Enter is pressed', async () => {
      renderComponent();

      const filterInput = screen.getByTestId('backups-filter-input');
      await userEvent.type(filterInput, 'my-workspace');

      // All rows still shown — filter not applied yet
      const workspaceNames = screen.getAllByTestId('backup-workspace-name');
      expect(workspaceNames).toHaveLength(3);
    });

    test('should filter on Enter key', async () => {
      renderComponent();

      const filterInput = screen.getByTestId('backups-filter-input');
      await userEvent.type(filterInput, 'my-workspace{Enter}');

      const workspaceNames = screen.getAllByTestId('backup-workspace-name');
      expect(workspaceNames).toHaveLength(1);
      expect(workspaceNames[0]).toHaveTextContent('my-workspace');
    });

    test('should filter on search button click', async () => {
      renderComponent();

      const filterInput = screen.getByTestId('backups-filter-input');
      await userEvent.type(filterInput, 'my-workspace');

      const searchButton = screen.getByTestId('backups-filter-button');
      await userEvent.click(searchButton);

      const workspaceNames = screen.getAllByTestId('backup-workspace-name');
      expect(workspaceNames).toHaveLength(1);
    });

    test('should clear filter on Escape key', async () => {
      renderComponent();

      const filterInput = screen.getByTestId('backups-filter-input');
      await userEvent.type(filterInput, 'my-workspace{Enter}');

      expect(screen.getAllByTestId('backup-workspace-name')).toHaveLength(1);

      await userEvent.type(filterInput, '{Escape}');

      expect(screen.getAllByTestId('backup-workspace-name')).toHaveLength(3);
    });

    test('should show nothing-found message when filter matches nothing', async () => {
      renderComponent();

      const filterInput = screen.getByTestId('backups-filter-input');
      await userEvent.type(filterInput, 'nonexistent{Enter}');

      expect(screen.getByTestId('backups-nothing-found')).toBeTruthy();
    });

    test('should be case-insensitive', async () => {
      renderComponent();

      const filterInput = screen.getByTestId('backups-filter-input');
      await userEvent.type(filterInput, 'MY-WORKSPACE{Enter}');

      const workspaceNames = screen.getAllByTestId('backup-workspace-name');
      expect(workspaceNames).toHaveLength(1);
    });
  });

  describe('actions dropdown', () => {
    test('should render kebab toggle for each row', () => {
      renderComponent();

      expect(screen.getByTestId('actions-dropdown-toggle-my-workspace')).toBeTruthy();
      expect(screen.getByTestId('actions-dropdown-toggle-deleted-workspace')).toBeTruthy();
      expect(screen.getByTestId('actions-dropdown-toggle-another-workspace')).toBeTruthy();
    });

    test('should show "Create from Backup" option when dropdown is opened', async () => {
      renderComponent();

      const toggle = screen.getByTestId('actions-dropdown-toggle-my-workspace');
      await userEvent.click(toggle);

      expect(screen.getByTestId('create-from-backup-my-workspace')).toBeTruthy();
    });

    test('should navigate to create workspace when "Create from Backup" is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const toggle = screen.getByTestId('actions-dropdown-toggle-my-workspace');
      await user.click(toggle);

      const menuItems = screen.getAllByRole('menuitem');
      const createAction = menuItems.find(el => el.textContent?.includes('Create from Backup'));
      expect(createAction).toBeTruthy();
      await user.click(createAction!);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      const navigateArg = mockNavigate.mock.calls[0][0];
      expect(navigateArg.search).toContain('backupImageUrl=');
    });
  });

  describe('sorting', () => {
    test('should sort by workspace name when Name column header is clicked', async () => {
      renderComponent();

      const nameHeader = screen.getByText('Workspace Name');
      await userEvent.click(nameHeader);

      const workspaceNames = screen.getAllByTestId('backup-workspace-name');
      expect(workspaceNames[0]).toHaveTextContent('another-workspace');
    });

    test('should sort by size when Size column header is clicked', async () => {
      renderComponent();

      const sizeHeader = screen.getByText('Size');
      await userEvent.click(sizeHeader);

      const sizes = screen.getAllByTestId('backup-size');
      expect(sizes).toHaveLength(3);
    });

    test('should reverse sort direction on second click', async () => {
      renderComponent();

      const nameHeader = screen.getByText('Workspace Name');
      await userEvent.click(nameHeader);
      await userEvent.click(nameHeader);

      const workspaceNames = screen.getAllByTestId('backup-workspace-name');
      expect(workspaceNames[0]).toHaveTextContent('my-workspace');
    });

    test('should sort backups with empty timestamps without crashing (UNAVAILABLE backups)', () => {
      // Arrange: mix of valid and empty timestamps
      const backupsWithEmptyTs: BackupItem[] = [
        {
          ...mockBackups[0],
          workspaceName: 'ws-a',
          timestamp: '2026-02-10T12:00:00Z',
          imageUrl: 'img-a',
        },
        {
          ...mockBackups[0],
          workspaceName: 'ws-b',
          timestamp: undefined,
          imageUrl: 'img-b',
        },
        {
          ...mockBackups[0],
          workspaceName: 'ws-c',
          timestamp: '2026-02-09T12:00:00Z',
          imageUrl: 'img-c',
        },
      ];

      // Act: render — should not throw; getSortedBackups is called during render
      expect(() => {
        renderComponent(backupsWithEmptyTs);
      }).not.toThrow();

      // Assert: all three rows rendered
      const workspaceNames = screen.getAllByTestId('backup-workspace-name');
      expect(workspaceNames).toHaveLength(3);
    });
  });

  describe('formatBytes', () => {
    test('should display hyphen for zero bytes', () => {
      const backup: BackupItem[] = [
        {
          workspaceName: 'zero-workspace',
          imageUrl: 'registry/zero:latest',
          timestamp: '2025-01-15T14:30:00Z',
          sizeBytes: 0,
          workspaceExists: true,
          labels: {},
        },
      ];
      renderComponent(backup);

      const size = screen.getByTestId('backup-size');
      expect(size).toHaveTextContent('-');
    });

    test('should display KB for kilobyte sizes', () => {
      const backup: BackupItem[] = [
        {
          workspaceName: 'kb-workspace',
          imageUrl: 'registry/kb:latest',
          timestamp: '2025-01-15T14:30:00Z',
          sizeBytes: 524288,
          workspaceExists: true,
          labels: {},
        },
      ];
      renderComponent(backup);

      const size = screen.getByTestId('backup-size');
      expect(size).toHaveTextContent('512.0 KB');
    });

    test('should display MB for megabyte sizes', () => {
      const backup: BackupItem[] = [
        {
          workspaceName: 'mb-workspace',
          imageUrl: 'registry/mb:latest',
          timestamp: '2025-01-15T14:30:00Z',
          sizeBytes: 1048576,
          workspaceExists: true,
          labels: {},
        },
      ];
      renderComponent(backup);

      const size = screen.getByTestId('backup-size');
      expect(size).toHaveTextContent('1.0 MB');
    });
  });

  describe('toolbar', () => {
    test('should render toolbar', () => {
      renderComponent();

      expect(screen.getByTestId('backups-view-toolbar')).toBeTruthy();
    });

    test('should show "No backup schedule configured" when backupSchedule is undefined', () => {
      renderComponent(mockBackups, undefined);

      expect(screen.getByTestId('next-scheduled-backup')).toHaveTextContent(
        'No backup schedule configured',
      );
    });

    test('should display human-readable backup schedule', () => {
      renderComponent(mockBackups, '0 1 * * *');

      const el = screen.getByTestId('next-scheduled-backup');
      expect(el).toHaveTextContent('Backup schedule: At 01:00 AM');
    });
  });
});
