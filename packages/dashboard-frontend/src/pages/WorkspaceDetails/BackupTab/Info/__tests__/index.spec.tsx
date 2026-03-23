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

import { BackupTabInfo } from '..';

jest.mock('@/services/helpers/dates', () => ({
  formatDate: jest.fn(() => 'Jan 15, 2:30 p.m.'),
  formatRelativeDate: jest.fn(() => '2 hours ago'),
}));

jest.mock('cronstrue', () => ({
  __esModule: true,
  default: { toString: jest.fn((expr: string) => `Every day at ${expr}`) },
}));

jest.mock('@/components/BackupStatusBadge', () => ({
  BackupStatusBadge: (props: { status: string }) => (
    <span data-testid="backup-status-badge">{props.status}</span>
  ),
}));

jest.mock('@patternfly/react-core', () => {
  const actual = jest.requireActual('@patternfly/react-core');
  return {
    ...actual,
    ClipboardCopy: (props: { children: React.ReactNode }) => (
      <div data-testid="clipboard-copy">{props.children}</div>
    ),
  };
});

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

describe('BackupTabInfo', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('success', () => {
    const backupInfo: BackupInfo = {
      status: BackupStatus.SUCCESS,
      lastBackupTime: '2026-02-11T12:30:00Z',
      backupImageUrl: 'registry.example.com/backups/my-workspace:latest',
      backupSchedule: '0 1 * * *',
    };

    test('should display backup status badge', () => {
      renderComponent(backupInfo, true);

      expect(screen.getByTestId('backup-status-badge')).toBeInTheDocument();
      expect(screen.getByTestId('backup-status-badge')).toHaveTextContent(BackupStatus.SUCCESS);
    });

    test('should display last backup time', () => {
      renderComponent(backupInfo, true);

      expect(screen.getByText('Last Backup')).toBeInTheDocument();
    });

    test('should display backup image URL with clipboard copy', () => {
      renderComponent(backupInfo, true);

      expect(screen.getByText('Backup Image')).toBeInTheDocument();
      expect(
        screen.getByText('registry.example.com/backups/my-workspace:latest'),
      ).toBeInTheDocument();
    });

    test('should show backup schedule alongside last backup', () => {
      renderComponent(backupInfo, true);

      expect(screen.getByText('Backup Schedule')).toBeInTheDocument();
      expect(screen.getByText('Last Backup')).toBeInTheDocument();
    });

    test('should show "Backup is current" when workspace is stopped', () => {
      renderComponent(backupInfo, true);

      expect(screen.getByText('Backup is current.')).toBeInTheDocument();
    });

    test('should show "Backup will run when the workspace stops" when running', () => {
      renderComponent(backupInfo, false);

      expect(screen.getByText('Backup will run when the workspace stops.')).toBeInTheDocument();
    });

    test('snapshot - success stopped', () => {
      const snapshot = createSnapshot(backupInfo, true);
      expect(snapshot.toJSON()).toMatchSnapshot();
    });

    test('snapshot - success running', () => {
      const snapshot = createSnapshot(backupInfo, false);
      expect(snapshot.toJSON()).toMatchSnapshot();
    });
  });

  describe('never backed up', () => {
    const backupInfo: BackupInfo = {
      status: BackupStatus.NEVER,
      backupSchedule: '0 1 * * *',
    };

    test('should display never status', () => {
      renderComponent(backupInfo, true);

      expect(screen.getByTestId('backup-status-badge')).toHaveTextContent(BackupStatus.NEVER);
    });

    test('should show backup schedule instead of last backup time', () => {
      renderComponent(backupInfo, true);

      expect(screen.getByText('Backup Schedule')).toBeInTheDocument();
      expect(screen.queryByText('Last Backup')).not.toBeInTheDocument();
    });

    test('should show explanation that backups run only when stopped', () => {
      renderComponent(backupInfo, true);

      expect(
        screen.getByText('Backups run only when the workspace is stopped.'),
      ).toBeInTheDocument();
    });

    test('should not display backup image URL when not available', () => {
      renderComponent(backupInfo, true);

      expect(screen.queryByText('Backup Image')).not.toBeInTheDocument();
    });

    test('snapshot - never status', () => {
      const snapshot = createSnapshot(backupInfo, true);
      expect(snapshot.toJSON()).toMatchSnapshot();
    });
  });

  describe('failed', () => {
    const backupInfo: BackupInfo = {
      status: BackupStatus.FAILED,
      lastBackupTime: '2026-02-10T08:00:00Z',
      backupSchedule: '0 1 * * *',
      error: 'Registry authentication failed',
    };

    test('should display failed status', () => {
      renderComponent(backupInfo, true);

      expect(screen.getByTestId('backup-status-badge')).toHaveTextContent(BackupStatus.FAILED);
    });

    test('should show error message', () => {
      renderComponent(backupInfo, true);

      expect(screen.getByText('Registry authentication failed')).toBeInTheDocument();
    });

    test('should show retry message when stopped', () => {
      renderComponent(backupInfo, true);

      expect(screen.getByText('Will retry on next scheduled run.')).toBeInTheDocument();
    });

    test('should show retry on stop message when running', () => {
      renderComponent(backupInfo, false);

      expect(screen.getByText('Will retry when the workspace stops.')).toBeInTheDocument();
    });

    test('snapshot - failed status', () => {
      const snapshot = createSnapshot(backupInfo, true);
      expect(snapshot.toJSON()).toMatchSnapshot();
    });
  });

  describe('in progress', () => {
    const backupInfo: BackupInfo = {
      status: BackupStatus.IN_PROGRESS,
      lastBackupTime: '2026-02-11T10:00:00Z',
      backupSchedule: '0 1 * * *',
    };

    test('should display in-progress status', () => {
      renderComponent(backupInfo, true);

      expect(screen.getByTestId('backup-status-badge')).toHaveTextContent(BackupStatus.IN_PROGRESS);
    });

    test('should show in-progress helper text', () => {
      renderComponent(backupInfo, true);

      expect(screen.getByText('Backup is in progress.')).toBeInTheDocument();
    });

    test('snapshot - in-progress status', () => {
      const snapshot = createSnapshot(backupInfo, true);
      expect(snapshot.toJSON()).toMatchSnapshot();
    });
  });

  describe('unavailable', () => {
    const backupInfo: BackupInfo = {
      status: BackupStatus.UNAVAILABLE,
      backupSchedule: '0 1 * * *',
      backupImageUrl: 'registry.example.com/backups/my-workspace:latest',
    };

    test('should hide last backup and backup image', () => {
      renderComponent(backupInfo, true);

      expect(screen.queryByText('Last Backup')).not.toBeInTheDocument();
      expect(screen.queryByText('Backup Image')).not.toBeInTheDocument();
    });

    test('should show unavailable helper text', () => {
      renderComponent(backupInfo, true);

      expect(screen.getByText('Backup image was not found in the registry.')).toBeInTheDocument();
    });

    test('snapshot - unavailable status', () => {
      const snapshot = createSnapshot(backupInfo, true);
      expect(snapshot.toJSON()).toMatchSnapshot();
    });
  });
});

function getComponent(backupInfo: BackupInfo, isWorkspaceStopped: boolean) {
  return <BackupTabInfo backupInfo={backupInfo} isWorkspaceStopped={isWorkspaceStopped} />;
}
