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
import { Provider } from 'react-redux';
import { Location, MemoryRouter } from 'react-router-dom';

import { container } from '@/inversify.config';
import { Props, WorkspaceDetails } from '@/pages/WorkspaceDetails';
import { mockShowAlert } from '@/pages/WorkspaceDetails/__mocks__';
import { AppAlerts } from '@/services/alerts/appAlerts';
import devfileApi from '@/services/devfileApi';
import { AlertItem, WorkspaceDetailsTab } from '@/services/helpers/types';
import { constructWorkspace } from '@/services/workspace-adapter';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';

const mockOnSave = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@/pages/WorkspaceDetails/OverviewTab');
jest.mock('@/pages/WorkspaceDetails/Header');
jest.mock('@/pages/WorkspaceDetails/Header/Actions', () => ({
  WorkspaceDetailsHeaderActions: () => <div>Header Actions</div>,
}));
jest.mock('@/components/WorkspaceLogs');
jest.mock('@/components/WorkspaceEvents');
jest.mock('@/pages/WorkspaceDetails/StorageTab', () => ({
  __esModule: true,
  default: (props: { isActive: boolean }) => (
    <div data-testid="storage-tab">Storage tab active: {String(props.isActive)}</div>
  ),
}));

const workspaceName = 'wksp';
const namespace = 'che-user';

describe('Workspace Details page', () => {
  let devWorkspaceBuilder: DevWorkspaceBuilder;

  beforeEach(() => {
    devWorkspaceBuilder = new DevWorkspaceBuilder()
      .withName(workspaceName)
      .withNamespace(namespace);

    class MockAppAlerts extends AppAlerts {
      showAlert(alert: AlertItem): void {
        mockShowAlert(alert);
      }
    }
    container.snapshot();
    container.rebind(AppAlerts).to(MockAppAlerts).inSingletonScope();
  });

  afterEach(() => {
    jest.clearAllMocks();
    window.location.href = '/';
    container.restore();
  });

  it('should show Workspace not found', () => {
    renderComponent();

    expect(screen.queryByText('Workspace not found.')).toBeTruthy();
  });

  describe('Tabs', () => {
    it('should activate the Overview tab by default', async () => {
      const workspace = constructWorkspace(devWorkspaceBuilder.build());
      renderComponent({
        workspace,
      });

      await waitFor(() =>
        expect(screen.queryByRole('tabpanel', { name: 'Overview' })).not.toBeNull(),
      );
    });

    it('should have six tabs visible', () => {
      const workspace = constructWorkspace(devWorkspaceBuilder.build());
      renderComponent({
        workspace,
      });

      const allTabs = screen.getAllByRole('tab');
      expect(allTabs.length).toBe(6);

      const overviewTab = screen.queryByRole('tab', { name: 'Overview' });
      const storageTab = screen.queryByRole('tab', { name: 'Storage' });
      const backupTab = screen.queryByRole('tab', { name: 'Backup' });
      const logsTab = screen.queryByRole('tab', { name: 'Logs' });
      const eventsTab = screen.queryByRole('tab', { name: 'Events' });
      const advancedTab = screen.queryByRole('tab', { name: 'Advanced' });

      expect(overviewTab).not.toBeNull();
      expect(storageTab).not.toBeNull();
      expect(backupTab).not.toBeNull();
      expect(logsTab).not.toBeNull();
      expect(eventsTab).not.toBeNull();
      expect(advancedTab).not.toBeNull();
    });

    it('should not show the Devfile tab', () => {
      const workspace = constructWorkspace(devWorkspaceBuilder.build());
      renderComponent({
        workspace,
      });

      expect(screen.queryByRole('tab', { name: 'Devfile' })).toBeNull();
    });

    it('should fall back to the Overview tab for the Devfile tab search param', async () => {
      const workspace = constructWorkspace(devWorkspaceBuilder.build());
      renderComponent({ workspace }, `?tab=${WorkspaceDetailsTab.DEVFILE}`);

      await waitFor(() =>
        expect(screen.queryByRole('tabpanel', { name: 'Overview' })).not.toBeNull(),
      );
    });

    it('should activate the tab provided in the location search params', async () => {
      const workspace = constructWorkspace(devWorkspaceBuilder.build());
      renderComponent(
        {
          workspace,
        },
        `?tab=${WorkspaceDetailsTab.BACKUP}`,
      );

      await waitFor(() =>
        expect(screen.queryByRole('tabpanel', { name: 'Backup' })).not.toBeNull(),
      );
    });

    it('should activate the Storage tab from the location search params', async () => {
      const workspace = constructWorkspace(devWorkspaceBuilder.build());
      renderComponent(
        {
          workspace,
        },
        `?tab=${WorkspaceDetailsTab.STORAGE}`,
      );

      await waitFor(() =>
        expect(screen.queryByRole('tabpanel', { name: 'Storage' })).not.toBeNull(),
      );
      expect(screen.getByTestId('storage-tab')).toHaveTextContent('Storage tab active: true');
    });

    it('should place the Storage tab after the Overview tab', () => {
      const workspace = constructWorkspace(devWorkspaceBuilder.build());
      renderComponent({
        workspace,
      });

      const tabNames = screen.getAllByRole('tab').map(tab => tab.textContent);
      expect(tabNames.indexOf('Storage')).toEqual(tabNames.indexOf('Overview') + 1);
    });

    it('should fall back to the Overview tab for an unknown tab search param', async () => {
      const workspace = constructWorkspace(devWorkspaceBuilder.build());
      renderComponent(
        {
          workspace,
        },
        '?tab=UnknownTab',
      );

      await waitFor(() =>
        expect(screen.queryByRole('tabpanel', { name: 'Overview' })).not.toBeNull(),
      );
    });

    it('should fall back to the Overview tab when the pathname is not a workspace details path', async () => {
      const workspace = constructWorkspace(devWorkspaceBuilder.build());
      renderComponent(
        {
          workspace,
        },
        `?tab=${WorkspaceDetailsTab.BACKUP}`,
        '/not-a-workspace-path',
      );

      await waitFor(() =>
        expect(screen.queryByRole('tabpanel', { name: 'Overview' })).not.toBeNull(),
      );
    });
  });

  it('should handle the onSave event', async () => {
    const workspace = constructWorkspace(devWorkspaceBuilder.build());
    renderComponent({
      workspace,
    });

    const saveButton = screen.getByRole('button', { name: 'Update workspace' });
    await userEvent.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  it('should not show the "Show Original Devfile" link', () => {
    const workspace = constructWorkspace(devWorkspaceBuilder.build());
    renderComponent({
      workspace,
    });

    expect(screen.queryByRole('link', { name: 'Show Original Devfile' })).toBeNull();
    expect(screen.queryByText('Show Original Devfile')).toBeNull();
  });

  describe('onSave error handling', () => {
    it('should show a danger alert when saving fails', async () => {
      const workspace = constructWorkspace(devWorkspaceBuilder.build());
      mockOnSave.mockRejectedValueOnce(new Error('Failed to save the workspace'));
      renderComponent({
        workspace,
      });

      const saveButton = screen.getByRole('button', { name: 'Update workspace' });
      await userEvent.click(saveButton);

      await waitFor(() =>
        expect(mockShowAlert).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Failed to save the workspace',
            variant: 'danger',
          }),
        ),
      );
    });
  });
});

function renderComponent(props?: Partial<Props>, search?: string, pathname?: string): void {
  const workspaces = props?.workspace ? [props.workspace.ref as devfileApi.DevWorkspace] : [];
  const store = new MockStoreBuilder().withDevWorkspaces({ workspaces }).build();
  const location = {
    key: 'workspace-details-key',
    pathname: pathname || `/workspace/${namespace}/${workspaceName}`,
    search,
  } as Location;
  render(
    <MemoryRouter>
      <Provider store={store}>
        <WorkspaceDetails
          location={location}
          navigate={mockNavigate}
          isLoading={props?.isLoading || false}
          workspace={props?.workspace}
          workspacesLink={props?.workspacesLink || '/workspaces'}
          onSave={mockOnSave}
        />
      </Provider>
    </MemoryRouter>,
  );
}
