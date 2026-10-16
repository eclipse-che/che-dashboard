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

import { WorkspaceStorageInfo } from '@eclipse-che/common';
import { AlertVariant } from '@patternfly/react-core';
import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { container } from '@/inversify.config';
import { Props as ResizeModalProps } from '@/pages/WorkspaceDetails/StorageTab/ResizeModal';
import getComponentRenderer, { screen, waitFor } from '@/services/__mocks__/getComponentRenderer';
import { AppAlerts } from '@/services/alerts/appAlerts';
import {
  getWorkspaceStorage,
  getWorkspaceStorageUsage,
} from '@/services/backend-client/workspaceStorageApi';
import { AlertItem } from '@/services/helpers/types';
import { constructWorkspace, Workspace } from '@/services/workspace-adapter';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';

import { POLLING_INTERVAL_MS, StorageTab } from '..';

jest.mock('@/services/backend-client/workspaceStorageApi');

const resizedInfo: WorkspaceStorageInfo = {
  strategy: 'per-workspace',
  pvcName: 'storage-workspace1af2f1d9f3b745f6',
  shared: false,
  requested: '15Gi',
  capacity: '10Gi',
  expandability: 'allowed',
  resizing: true,
  fsResizePending: false,
};

jest.mock('@/pages/WorkspaceDetails/StorageTab/ResizeModal', () => ({
  ResizeModal: (props: ResizeModalProps) => (
    <div data-testid="resize-modal">
      <span>Modal for {props.info.pvcName}</span>
      <button onClick={() => props.onClose()}>Close modal</button>
      <button onClick={() => props.onResized(resizedInfo)}>Resize done</button>
      <button
        onClick={() => props.onResized({ ...resizedInfo, capacity: '15Gi', resizing: false })}
      >
        Resize completed
      </button>
    </div>
  ),
}));

const mockShowAlert = jest.fn();
const mockGetStorage = getWorkspaceStorage as jest.Mock;
const mockGetUsage = getWorkspaceStorageUsage as jest.Mock;

const GI = 1024 ** 3;

const perWorkspaceInfo: WorkspaceStorageInfo = {
  strategy: 'per-workspace',
  pvcName: 'storage-workspace1af2f1d9f3b745f6',
  shared: false,
  storageClassName: 'standard',
  requested: '10Gi',
  capacity: '10Gi',
  expandability: 'allowed',
  resizing: false,
  fsResizePending: false,
};

const usage = { totalBytes: 10 * GI, usedBytes: 5.3 * GI, availableBytes: 4.7 * GI };

const { renderComponent } = getComponentRenderer(getComponent);

function buildWorkspace(phase: 'RUNNING' | 'STOPPED', uid = 'uid-1'): Workspace {
  return constructWorkspace(
    new DevWorkspaceBuilder()
      .withName('my-workspace')
      .withNamespace('user-che')
      .withUID(uid)
      .withStatus({ phase, devworkspaceId: 'workspace1af2f1d9f3b745f6' })
      .build(),
  );
}

describe('StorageTab', () => {
  let runningWorkspace: Workspace;
  let stoppedWorkspace: Workspace;

  beforeEach(() => {
    class MockAppAlerts extends AppAlerts {
      showAlert(alert: AlertItem): void {
        mockShowAlert(alert);
      }
    }
    container.snapshot();
    container.rebind(AppAlerts).to(MockAppAlerts).inSingletonScope();

    runningWorkspace = buildWorkspace('RUNNING');
    stoppedWorkspace = buildWorkspace('STOPPED');
    mockGetStorage.mockResolvedValue(perWorkspaceInfo);
    mockGetUsage.mockResolvedValue(usage);
  });

  afterEach(() => {
    container.restore();
    // don't reset all mocks: it would reset the global Tooltip mock as well
    mockGetStorage.mockReset();
    mockGetUsage.mockReset();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('renders donut, name, capacity and the resize button', async () => {
    renderComponent(runningWorkspace);

    await waitFor(() =>
      expect(screen.getByTestId('storage-usage-donut')).toHaveTextContent('4.7 Gi'),
    );
    expect(mockGetStorage).toHaveBeenCalledWith('user-che', 'my-workspace');
    expect(mockGetUsage).toHaveBeenCalledWith('user-che', 'my-workspace');
    expect(screen.getByTestId('storage-pvc-name')).toHaveTextContent(
      'storage-workspace1af2f1d9f3b745f6',
    );
    expect(screen.getByTestId('storage-capacity')).toHaveTextContent(/^10 Gi$/);
    expect(screen.getByRole('button', { name: 'Resize…' })).toBeEnabled();
    expect(screen.queryByText('Shared')).toBeNull();
    expect(screen.queryByTestId('tooltip-content')).toBeNull();
  });

  test('does not fetch anything while the tab is inactive', async () => {
    const { reRenderComponent } = renderComponent(runningWorkspace, false);

    expect(mockGetStorage).not.toHaveBeenCalled();
    expect(mockGetUsage).not.toHaveBeenCalled();

    reRenderComponent(runningWorkspace, true);

    await waitFor(() => expect(mockGetStorage).toHaveBeenCalledTimes(1));
  });

  test('shows the [Shared] badge for per-user storage', async () => {
    mockGetStorage.mockResolvedValue({
      ...perWorkspaceInfo,
      strategy: 'per-user',
      pvcName: 'claim-devworkspace',
      shared: true,
    });

    renderComponent(runningWorkspace);

    await waitFor(() =>
      expect(screen.getByTestId('storage-pvc-name')).toHaveTextContent('claim-devworkspace'),
    );
    expect(screen.getByText('Shared')).toBeTruthy();
    expect(screen.getByTestId('storage-usage-shared')).toHaveTextContent(
      'the usage includes all workspaces in this namespace',
    );
  });

  test('falls back to the requested size and a dash when capacity and name are unknown', async () => {
    mockGetStorage.mockResolvedValue({
      ...perWorkspaceInfo,
      pvcName: undefined,
      capacity: undefined,
    });

    renderComponent(runningWorkspace);

    await waitFor(() => expect(screen.getByTestId('storage-pvc-name')).toHaveTextContent('—'));
    expect(screen.getByTestId('storage-capacity')).toHaveTextContent(/^10 Gi$/);
  });

  test('stopped workspace: asks to start it, resize remains possible', async () => {
    renderComponent(stoppedWorkspace);

    await waitFor(() => expect(screen.getByTestId('storage-pvc-name')).toBeTruthy());
    expect(mockGetUsage).not.toHaveBeenCalled();
    expect(screen.getByTestId('storage-usage-donut')).toHaveTextContent('Start the');
    expect(screen.getByRole('button', { name: 'Resize…' })).toBeEnabled();
  });

  test('forbidden expansion: button disabled with a tooltip', async () => {
    mockGetStorage.mockResolvedValue({ ...perWorkspaceInfo, expandability: 'forbidden' });

    renderComponent(runningWorkspace);

    const button = await screen.findByRole('button', { name: 'Resize…' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    // Tooltip is mocked globally and renders its content
    expect(screen.getByTestId('tooltip-content')).toHaveTextContent(
      'Storage class does not allow expansion',
    );

    await userEvent.click(button);
    expect(screen.queryByTestId('resize-modal')).toBeNull();
  });

  test('ephemeral storage: notice only, no button', async () => {
    mockGetStorage.mockResolvedValue({
      strategy: 'ephemeral',
      shared: false,
      expandability: 'unknown',
      resizing: false,
      fsResizePending: false,
    });

    renderComponent(runningWorkspace);

    expect(await screen.findByTestId('storage-ephemeral')).toHaveTextContent(
      'There is no volume to manage',
    );
    expect(screen.queryByRole('button', { name: 'Resize…' })).toBeNull();
    expect(screen.queryByTestId('storage-usage-donut')).toBeNull();
    expect(mockGetUsage).not.toHaveBeenCalled();
  });

  test('resizing: shows the target size and polls until done', async () => {
    jest.useFakeTimers();
    mockGetStorage
      .mockResolvedValueOnce({ ...perWorkspaceInfo, requested: '15Gi', resizing: true })
      .mockResolvedValueOnce({ ...perWorkspaceInfo, requested: '15Gi', resizing: true })
      .mockResolvedValue({ ...perWorkspaceInfo, requested: '15Gi', capacity: '15Gi' });

    renderComponent(runningWorkspace);

    await waitFor(() =>
      expect(screen.getByTestId('storage-capacity')).toHaveTextContent('10 Gi → 15 Gi'),
    );
    expect(screen.getByTestId('storage-capacity')).toHaveTextContent('Resizing');
    expect(mockGetStorage).toHaveBeenCalledTimes(1);
    expect(mockShowAlert).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(POLLING_INTERVAL_MS);
    });
    await waitFor(() => expect(mockGetStorage).toHaveBeenCalledTimes(2));

    await act(async () => {
      jest.advanceTimersByTime(POLLING_INTERVAL_MS);
    });
    await waitFor(() =>
      expect(screen.getByTestId('storage-capacity')).toHaveTextContent(/^15 Gi$/),
    );
    expect(mockGetStorage).toHaveBeenCalledTimes(3);
    expect(mockShowAlert).toHaveBeenCalledTimes(1);
    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Storage resized',
        variant: AlertVariant.success,
        children: 'The volume of my-workspace is now 15 Gi.',
      }),
    );

    // polling stops once the resize is done
    await act(async () => {
      jest.advanceTimersByTime(POLLING_INTERVAL_MS * 3);
    });
    expect(mockGetStorage).toHaveBeenCalledTimes(3);
  });

  test('polling stops when the tab becomes inactive', async () => {
    jest.useFakeTimers();
    mockGetStorage.mockResolvedValue({ ...perWorkspaceInfo, requested: '15Gi', resizing: true });

    const { reRenderComponent } = renderComponent(runningWorkspace);
    await waitFor(() => expect(screen.getByTestId('storage-capacity')).toBeTruthy());

    reRenderComponent(runningWorkspace, false);
    await act(async () => {
      jest.advanceTimersByTime(POLLING_INTERVAL_MS * 2);
    });

    expect(mockGetStorage).toHaveBeenCalledTimes(1);
  });

  test('fsResizePending: asks to restart the workspace', async () => {
    mockGetStorage.mockResolvedValue({
      ...perWorkspaceInfo,
      requested: '15Gi',
      fsResizePending: true,
    });

    renderComponent(runningWorkspace);

    expect(await screen.findByTestId('storage-restart-message')).toHaveTextContent(
      'Restart the workspace to apply the new size.',
    );
    expect(screen.getByTestId('storage-capacity')).toHaveTextContent('10 Gi → 15 Gi');
    expect(screen.getByTestId('storage-capacity')).not.toHaveTextContent('Resizing');
  });

  test('usage fetch failure does not break the tab', async () => {
    mockGetUsage.mockRejectedValue(new Error('exec failed'));

    renderComponent(runningWorkspace);

    await waitFor(() =>
      expect(screen.getByTestId('storage-usage-donut')).toHaveTextContent('unavailable'),
    );
    expect(screen.getByTestId('storage-pvc-name')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Resize…' })).toBeEnabled();
  });

  test('storage info fetch failure shows an error', async () => {
    mockGetStorage.mockRejectedValue(new Error('PVC not found'));

    renderComponent(runningWorkspace);

    expect(await screen.findByText('Failed to load storage information')).toBeTruthy();
    expect(screen.getByText('PVC not found')).toBeTruthy();
  });

  test('refresh failure keeps the storage info and shows a warning', async () => {
    jest.useFakeTimers();
    mockGetStorage
      .mockResolvedValueOnce({ ...perWorkspaceInfo, requested: '15Gi', resizing: true })
      .mockRejectedValue(new Error('API unreachable'));

    renderComponent(runningWorkspace);
    await waitFor(() => expect(screen.getByTestId('storage-capacity')).toBeTruthy());

    await act(async () => {
      jest.advanceTimersByTime(POLLING_INTERVAL_MS);
    });

    expect(await screen.findByText('Failed to refresh storage information')).toBeTruthy();
    expect(screen.getByText('API unreachable')).toBeTruthy();
    expect(screen.getByTestId('storage-capacity')).toHaveTextContent('10 Gi → 15 Gi');
  });

  test('ignores the storage info resolved after unmount', async () => {
    let resolveInfo: (info: WorkspaceStorageInfo) => void = () => undefined;
    mockGetStorage.mockReturnValue(new Promise(resolve => (resolveInfo = resolve)));

    const { unmount } = render(getComponent(runningWorkspace));
    await waitFor(() => expect(mockGetStorage).toHaveBeenCalledTimes(1));
    unmount();

    await act(async () => resolveInfo(perWorkspaceInfo));

    expect(screen.queryByTestId('storage-pvc-name')).toBeNull();
    expect(mockShowAlert).not.toHaveBeenCalled();
  });

  test('reloads when the workspace starts', async () => {
    const { reRenderComponent } = renderComponent(stoppedWorkspace);
    await waitFor(() => expect(mockGetStorage).toHaveBeenCalledTimes(1));

    reRenderComponent(runningWorkspace, true);

    await waitFor(() => expect(mockGetUsage).toHaveBeenCalledTimes(1));
    expect(mockGetStorage).toHaveBeenCalledTimes(2);
  });

  test('opens the resize modal and closes it', async () => {
    renderComponent(runningWorkspace);

    await userEvent.click(await screen.findByRole('button', { name: 'Resize…' }));
    expect(screen.getByTestId('resize-modal')).toHaveTextContent(
      'Modal for storage-workspace1af2f1d9f3b745f6',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Close modal' }));
    expect(screen.queryByTestId('resize-modal')).toBeNull();
  });

  test('a successful resize closes the modal and refreshes the storage info', async () => {
    renderComponent(runningWorkspace);

    await userEvent.click(await screen.findByRole('button', { name: 'Resize…' }));
    mockGetStorage.mockResolvedValue({ ...perWorkspaceInfo, requested: '15Gi', resizing: true });
    await userEvent.click(screen.getByRole('button', { name: 'Resize done' }));

    expect(screen.queryByTestId('resize-modal')).toBeNull();
    expect(screen.getByTestId('storage-capacity')).toHaveTextContent('10 Gi → 15 Gi');
    await waitFor(() => expect(mockGetUsage).toHaveBeenCalledTimes(2));
    // the PATCH response is used as is, no extra GET
    expect(mockGetStorage).toHaveBeenCalledTimes(1);
    expect(mockShowAlert).not.toHaveBeenCalled();
  });

  test('a resize completed before the PATCH returns shows the success alert', async () => {
    renderComponent(runningWorkspace);

    await userEvent.click(await screen.findByRole('button', { name: 'Resize…' }));
    await userEvent.click(screen.getByRole('button', { name: 'Resize completed' }));

    expect(screen.getByTestId('storage-capacity')).toHaveTextContent(/^15 Gi$/);
    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Storage resized', variant: AlertVariant.success }),
    );
  });

  test('switching workspaces drops the storage info of the previous one', async () => {
    const { reRenderComponent } = renderComponent(runningWorkspace);
    await waitFor(() =>
      expect(screen.getByTestId('storage-pvc-name')).toHaveTextContent(
        'storage-workspace1af2f1d9f3b745f6',
      ),
    );

    let resolveInfo: (info: WorkspaceStorageInfo) => void = () => undefined;
    mockGetStorage.mockReturnValue(new Promise(resolve => (resolveInfo = resolve)));
    reRenderComponent(buildWorkspace('RUNNING', 'uid-2'));

    expect(screen.queryByTestId('storage-pvc-name')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Resize…' })).toBeNull();

    await act(async () => resolveInfo({ ...perWorkspaceInfo, pvcName: 'storage-other' }));
    expect(screen.getByTestId('storage-pvc-name')).toHaveTextContent('storage-other');
  });

  test('ignores a response of the previous workspace', async () => {
    let resolveInfo: (info: WorkspaceStorageInfo) => void = () => undefined;
    mockGetStorage.mockReturnValueOnce(new Promise(resolve => (resolveInfo = resolve)));
    const { reRenderComponent } = renderComponent(runningWorkspace);

    mockGetStorage.mockResolvedValue({ ...perWorkspaceInfo, pvcName: 'storage-other' });
    reRenderComponent(buildWorkspace('RUNNING', 'uid-2'));
    await waitFor(() =>
      expect(screen.getByTestId('storage-pvc-name')).toHaveTextContent('storage-other'),
    );

    await act(async () => resolveInfo(perWorkspaceInfo));
    expect(screen.getByTestId('storage-pvc-name')).toHaveTextContent('storage-other');
  });
});

function getComponent(workspace: Workspace, isActive = true): React.ReactElement {
  return <StorageTab workspace={workspace} isActive={isActive} />;
}
