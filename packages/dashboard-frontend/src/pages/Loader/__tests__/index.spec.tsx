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

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';
import { Location } from 'react-router-dom';
import { Store } from 'redux';

import getComponentRenderer from '@/services/__mocks__/getComponentRenderer';
import devfileApi from '@/services/devfileApi';
import { DevWorkspaceStatus, LoaderTab } from '@/services/helpers/types';
import { constructWorkspace, Workspace } from '@/services/workspace-adapter';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';

import { LoaderPage, Props } from '..';

jest.mock('@/components/WorkspaceProgress');
jest.mock('@/components/WorkspaceLogs');
jest.mock('@/components/WorkspaceEvents');

const { renderComponent } = getComponentRenderer(getComponent);

const mockOnTabChange = jest.fn();
const mockOnStartWorkspace = jest.fn();
const mockOnStopWorkspace = jest.fn();

const namespace = 'user-che';
const workspaceName = 'wksp-test';
const tabParam = LoaderTab.Progress;

describe('Loader page', () => {
  let devWorkspace: devfileApi.DevWorkspace;
  let workspace: Workspace;
  let store: Store;

  beforeEach(() => {
    devWorkspace = new DevWorkspaceBuilder()
      .withNamespace(namespace)
      .withName(workspaceName)
      .withStatus({ phase: 'STARTING' })
      .build();
    store = new MockStoreBuilder()
      .withDevWorkspaces({
        workspaces: [devWorkspace],
      })
      .build();
    workspace = constructWorkspace(devWorkspace);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle tab click', async () => {
    renderComponent(store, {
      tabParam,
      workspace,
      workspaceStatus: DevWorkspaceStatus.STARTING,
    });

    const tabButtonLogs = screen.getByRole('tab', { name: 'Logs' });
    await userEvent.click(tabButtonLogs);

    await waitFor(() => expect(mockOnTabChange).toHaveBeenCalledWith(LoaderTab.Logs));
  });

  it('should render Logs tab active', () => {
    renderComponent(store, {
      tabParam: LoaderTab.Logs,
      workspace,
      workspaceStatus: DevWorkspaceStatus.STARTING,
    });

    const tabpanelProgress = screen.queryByRole('tabpanel', { name: 'Progress' });
    const tabpanelLogs = screen.queryByRole('tabpanel', { name: 'Logs' });

    // disabled tab
    expect(tabpanelProgress).toBeNull();
    // active tab
    expect(tabpanelLogs).not.toBeNull();
  });

  it('should update the section header when the workspace is ready', () => {
    const store = new MockStoreBuilder().build();
    const { reRenderComponent } = renderComponent(store, {
      tabParam,
      workspace: undefined,
      workspaceStatus: DevWorkspaceStatus.STOPPED,
    });

    expect(screen.queryByRole('heading')).toHaveTextContent('Creating a workspace');

    const devWorkspaceReady = new DevWorkspaceBuilder()
      .withNamespace(namespace)
      .withName(workspaceName)
      .withStatus({ phase: 'RUNNING' })
      .build();
    const storeReady = new MockStoreBuilder()
      .withDevWorkspaces({
        workspaces: [devWorkspaceReady],
      })
      .build();

    reRenderComponent(storeReady, {
      tabParam,
      workspace: constructWorkspace(devWorkspaceReady),
      workspaceStatus: DevWorkspaceStatus.RUNNING,
    });

    expect(screen.queryByRole('heading')).toHaveTextContent('Starting workspace');
  });

  it('should show actions kebab when workspace is defined', () => {
    renderComponent(store, {
      tabParam,
      workspace,
      workspaceStatus: DevWorkspaceStatus.STARTING,
    });

    expect(screen.getByRole('button', { name: 'Workspace actions' })).toBeInTheDocument();
  });

  it('should not show actions kebab when workspace is undefined', () => {
    renderComponent(store, {
      tabParam,
      workspace: undefined,
      workspaceStatus: DevWorkspaceStatus.STOPPED,
    });

    expect(screen.queryByRole('button', { name: 'Workspace actions' })).toBeNull();
  });

  it('should call onStopWorkspace when Stop is clicked in kebab', async () => {
    renderComponent(store, {
      tabParam,
      workspace,
      workspaceStatus: DevWorkspaceStatus.STARTING,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Workspace actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: /stop/i }));

    await waitFor(() => expect(mockOnStopWorkspace).toHaveBeenCalledTimes(1));
  });

  it('should call onStartWorkspace when Start is clicked in kebab (workspace stopped)', async () => {
    renderComponent(store, {
      tabParam,
      workspace,
      workspaceStatus: DevWorkspaceStatus.STOPPED,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Workspace actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: /start/i }));

    await waitFor(() => expect(mockOnStartWorkspace).toHaveBeenCalledTimes(1));
  });
});

function getComponent(
  store: Store,
  props: Omit<
    Props,
    | 'onTabChange'
    | 'onStartWorkspace'
    | 'onStopWorkspace'
    | 'searchParams'
    | 'location'
    | 'navigate'
  >,
): React.ReactElement {
  return (
    <Provider store={store}>
      <LoaderPage
        location={{} as Location}
        navigate={jest.fn()}
        tabParam={props.tabParam}
        searchParams={new URLSearchParams()}
        workspace={props.workspace}
        workspaceStatus={props.workspaceStatus}
        onTabChange={mockOnTabChange}
        onStartWorkspace={mockOnStartWorkspace}
        onStopWorkspace={mockOnStopWorkspace}
      />
    </Provider>
  );
}
