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
import { constructWorkspace, Workspace } from '@/services/workspace-adapter';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';

const mockOnSave = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@/pages/WorkspaceDetails/DevfileEditorTab');
jest.mock('@/pages/WorkspaceDetails/OverviewTab');
jest.mock('@/pages/WorkspaceDetails/Header');
jest.mock('@/pages/WorkspaceDetails/Header/Actions', () => ({
  WorkspaceDetailsHeaderActions: () => <div>Header Actions</div>,
}));
jest.mock('@/components/WorkspaceLogs');
jest.mock('@/components/WorkspaceEvents');

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
      const devfileTab = screen.queryByRole('tab', { name: 'Devfile' });
      const backupTab = screen.queryByRole('tab', { name: 'Backup' });
      const logsTab = screen.queryByRole('tab', { name: 'Logs' });
      const eventsTab = screen.queryByRole('tab', { name: 'Events' });
      const advancedTab = screen.queryByRole('tab', { name: 'Advanced' });

      expect(overviewTab).not.toBeNull();
      expect(devfileTab).not.toBeNull();
      expect(backupTab).not.toBeNull();
      expect(logsTab).not.toBeNull();
      expect(eventsTab).not.toBeNull();
      expect(advancedTab).not.toBeNull();
    });

    it('should switch to the Devfile tab', async () => {
      const workspace = constructWorkspace(devWorkspaceBuilder.build());
      renderComponent({
        workspace,
      });

      const devfileTab = screen.getByRole('tab', { name: 'Devfile' });
      await userEvent.click(devfileTab);

      const tabpanel = screen.getByRole('tabpanel', { name: 'Devfile' });
      expect(tabpanel).not.toBeNull();
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

  it('should show the original devfile link when oldWorkspaceLocation is provided', () => {
    const workspace = constructWorkspace(devWorkspaceBuilder.build());
    const oldWorkspaceLocation = {
      pathname: '/old-workspace-path',
    } as Location;
    renderComponent({
      workspace,
      oldWorkspaceLocation,
    });

    const link = screen.getByRole('link', { name: 'Show Original Devfile' });
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('/old-workspace-path');
  });

  describe('onSave error handling', () => {
    it('should show a danger alert when saving fails on a non-Devfile tab', async () => {
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

    it('should re-throw the error when saving fails while the Devfile tab is active', async () => {
      const workspace = constructWorkspace(devWorkspaceBuilder.build());
      mockOnSave.mockRejectedValueOnce(new Error('Failed to save the workspace'));
      const ref = React.createRef<WorkspaceDetails>();
      renderComponent({ workspace }, `?tab=${WorkspaceDetailsTab.DEVFILE}`, undefined, ref);

      const instance = ref.current as unknown as {
        handleOnSave: (workspace: Workspace) => Promise<void>;
      };

      await expect(instance.handleOnSave(workspace)).rejects.toBe('Failed to save the workspace');

      expect(mockShowAlert).not.toHaveBeenCalled();
    });
  });
});

function renderComponent(
  props?: Partial<Props>,
  search?: string,
  pathname?: string,
  ref?: React.RefObject<WorkspaceDetails>,
): void {
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
          ref={ref}
          location={location}
          navigate={mockNavigate}
          isLoading={props?.isLoading || false}
          oldWorkspaceLocation={props?.oldWorkspaceLocation}
          workspace={props?.workspace}
          workspacesLink={props?.workspacesLink || '/workspaces'}
          onSave={mockOnSave}
        />
      </Provider>
    </MemoryRouter>,
  );
}
