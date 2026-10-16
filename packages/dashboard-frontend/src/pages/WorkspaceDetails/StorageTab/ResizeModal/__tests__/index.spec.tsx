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

import { WorkspaceStorageInfo, WorkspaceStorageQuotaCheck } from '@eclipse-che/common';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import getComponentRenderer, { screen, waitFor } from '@/services/__mocks__/getComponentRenderer';
import {
  checkWorkspaceStorageQuota,
  resizeWorkspaceStorage,
} from '@/services/backend-client/workspaceStorageApi';

import { QUOTA_CHECK_DEBOUNCE_MS, ResizeModal } from '..';

jest.mock('@/services/backend-client/workspaceStorageApi');

const mockCheckQuota = checkWorkspaceStorageQuota as jest.Mock;
const mockResize = resizeWorkspaceStorage as jest.Mock;
const mockOnClose = jest.fn();
const mockOnResized = jest.fn();

const namespace = 'user-che';
const workspaceName = 'my-workspace';

const perUserInfo: WorkspaceStorageInfo = {
  strategy: 'per-user',
  pvcName: 'claim-devworkspace',
  shared: true,
  storageClassName: 'standard',
  requested: '10Gi',
  capacity: '10Gi',
  expandability: 'allowed',
  resizing: false,
  fsResizePending: false,
};

const perWorkspaceInfo: WorkspaceStorageInfo = {
  ...perUserInfo,
  strategy: 'per-workspace',
  pvcName: 'storage-workspace1af2f1d9f3b745f6',
  shared: false,
};

const okQuota: WorkspaceStorageQuotaCheck = {
  status: 'ok',
  entries: [
    {
      source: 'ResourceQuota',
      name: 'storage',
      key: 'requests.storage',
      used: '20Gi',
      hard: '50Gi',
      projected: '25Gi',
      ok: true,
    },
  ],
  maxAllowedSize: '40Gi',
};

const exceededQuota: WorkspaceStorageQuotaCheck = {
  status: 'exceeded',
  entries: [
    {
      source: 'ResourceQuota',
      name: 'storage',
      key: 'requests.storage',
      used: '48Gi',
      hard: '50Gi',
      projected: '53Gi',
      ok: false,
    },
  ],
  maxAllowedSize: '12Gi',
};

const { renderComponent } = getComponentRenderer(getComponent);

describe('ResizeModal', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    jest.useFakeTimers();
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockCheckQuota.mockResolvedValue(okQuota);
  });

  afterEach(() => {
    mockCheckQuota.mockReset();
    mockResize.mockReset();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  async function flushQuotaCheck(): Promise<void> {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(QUOTA_CHECK_DEBOUNCE_MS);
    });
  }

  function getSizeInput(): HTMLInputElement {
    return screen.getByRole('spinbutton', { name: 'New size' }) as HTMLInputElement;
  }

  function getResizeButton(): HTMLElement {
    return screen.getByRole('button', { name: 'Resize' });
  }

  test('opens pre-filled with capacity + 5 Gi', async () => {
    renderComponent(perWorkspaceInfo);
    await flushQuotaCheck();

    expect(getSizeInput().value).toEqual('15');
    expect(screen.getByText('storage-workspace1af2f1d9f3b745f6')).toBeTruthy();
    expect(mockCheckQuota).toHaveBeenCalledWith(namespace, workspaceName, '15Gi');
  });

  test.each([
    ['ok', okQuota],
    ['exceeded', exceededQuota],
  ])('always renders the irreversibility warning (quota %s)', async (_status, quota) => {
    mockCheckQuota.mockResolvedValue(quota);
    renderComponent(perWorkspaceInfo);
    await flushQuotaCheck();

    expect(screen.getByTestId('irreversible-warning')).toHaveTextContent(
      'This action cannot be undone.',
    );
    expect(screen.getByTestId('irreversible-warning')).toHaveTextContent(
      'Kubernetes does not support shrinking volumes',
    );
  });

  test('[Resize] is disabled until the checkbox is checked', async () => {
    renderComponent(perWorkspaceInfo);
    await flushQuotaCheck();

    expect(getResizeButton()).toBeDisabled();

    await user.click(
      screen.getByRole('checkbox', { name: /I understand the storage cannot be reduced/ }),
    );

    expect(getResizeButton()).toBeEnabled();
  });

  test('the size cannot go below capacity + 1 Gi', async () => {
    renderComponent(perWorkspaceInfo);
    await flushQuotaCheck();

    const minus = screen.getByRole('button', { name: 'Decrease size' });
    for (let i = 0; i < 6; i++) {
      if (!(minus as HTMLButtonElement).disabled) {
        await user.click(minus);
      }
    }
    expect(getSizeInput().value).toEqual('11');
    expect(minus).toBeDisabled();

    await user.clear(getSizeInput());
    await user.type(getSizeInput(), '3');
    await user.tab();

    expect(getSizeInput().value).toEqual('11');
  });

  test('falls back to the requested size while the capacity is unknown', async () => {
    renderComponent({ ...perWorkspaceInfo, capacity: undefined });
    await flushQuotaCheck();

    expect(getSizeInput().value).toEqual('15');
    expect(screen.getByText('10 Gi')).toBeTruthy();
  });

  test('[Resize] is disabled while the typed size is too small', async () => {
    renderComponent(perWorkspaceInfo);
    await flushQuotaCheck();
    await user.click(screen.getByRole('checkbox'));

    await user.clear(getSizeInput());
    await user.type(getSizeInput(), '10');

    expect(getResizeButton()).toBeDisabled();
  });

  test('the shared notice is shown for per-user storage only', async () => {
    const { reRenderComponent } = renderComponent(perUserInfo);
    await flushQuotaCheck();

    expect(screen.getByTestId('shared-notice')).toHaveTextContent(
      'Shared by all workspaces in this namespace.',
    );
    expect(screen.getByText('Shared')).toBeTruthy();

    reRenderComponent(perWorkspaceInfo);
    expect(screen.queryByTestId('shared-notice')).toBeNull();
    expect(screen.queryByText('Shared')).toBeNull();
  });

  test('quota ok → ✔ line', async () => {
    renderComponent(perWorkspaceInfo);
    await flushQuotaCheck();

    const entry = screen.getByTestId('quota-entry');
    expect(entry).toHaveTextContent('requests.storage');
    expect(entry).toHaveTextContent('20 + 5 = 25 Gi / 50 Gi');
    expect(screen.getByLabelText('Within quota')).toBeTruthy();
    expect(screen.queryByTestId('quota-max-size')).toBeNull();
  });

  test('quota exceeded → ✖ line, max size shown, [Resize] disabled', async () => {
    mockCheckQuota.mockResolvedValue(exceededQuota);
    renderComponent(perWorkspaceInfo);
    await flushQuotaCheck();
    await user.click(screen.getByRole('checkbox'));

    const entry = screen.getByTestId('quota-entry');
    expect(entry).toHaveTextContent('48 + 5 = 53 Gi / 50 Gi');
    expect(entry).toHaveTextContent('Exceeds namespace quota by 3 Gi.');
    expect(screen.getByLabelText('Quota exceeded')).toBeTruthy();
    expect(screen.getByTestId('quota-max-size')).toHaveTextContent('Maximum new size: 12 Gi');
    expect(getResizeButton()).toBeDisabled();
  });

  test('LimitRange exceeded → maximum volume size message', async () => {
    mockCheckQuota.mockResolvedValue({
      status: 'exceeded',
      entries: [
        {
          source: 'LimitRange',
          name: 'limits',
          key: 'max.storage',
          hard: '12Gi',
          projected: '15Gi',
          ok: false,
        },
      ],
      maxAllowedSize: '12Gi',
    });
    renderComponent(perWorkspaceInfo);
    await flushQuotaCheck();

    const entry = screen.getByTestId('quota-entry');
    expect(entry).toHaveTextContent('max.storage');
    expect(entry).toHaveTextContent('15 Gi / 12 Gi');
    expect(entry).toHaveTextContent('Exceeds the maximum volume size by 3 Gi.');
  });

  test('an excess below the display precision is not shown as 0 Gi', async () => {
    mockCheckQuota.mockResolvedValue({
      status: 'exceeded',
      entries: [
        {
          source: 'ResourceQuota',
          name: 'storage',
          key: 'requests.storage',
          used: '45Gi',
          hard: '50Gi',
          projected: '50Gi',
          ok: false,
        },
      ],
    });
    renderComponent(perWorkspaceInfo);
    await flushQuotaCheck();

    expect(screen.getByTestId('quota-entry')).toHaveTextContent(
      'Exceeds namespace quota by less than 0.1 Gi.',
    );
  });

  test('quota unavailable → info line, [Resize] enabled', async () => {
    mockCheckQuota.mockResolvedValue({ status: 'unavailable', entries: [] });
    renderComponent(perWorkspaceInfo);
    await flushQuotaCheck();
    await user.click(screen.getByRole('checkbox'));

    expect(screen.getByTestId('quota-unavailable')).toHaveTextContent(
      'Namespace quota could not be read. The request will be validated by the cluster on submit.',
    );
    expect(getResizeButton()).toBeEnabled();
  });

  test('quota check failure is treated as unavailable', async () => {
    mockCheckQuota.mockRejectedValue(new Error('network'));
    renderComponent(perWorkspaceInfo);
    await flushQuotaCheck();

    expect(screen.getByTestId('quota-unavailable')).toBeTruthy();
  });

  test('no quota → ok line', async () => {
    mockCheckQuota.mockResolvedValue({ status: 'ok', entries: [] });
    renderComponent(perWorkspaceInfo);
    await flushQuotaCheck();

    expect(screen.getByTestId('quota-none')).toBeTruthy();
  });

  test('the quota check re-runs (debounced) when the size changes', async () => {
    renderComponent(perWorkspaceInfo);
    await flushQuotaCheck();
    expect(mockCheckQuota).toHaveBeenCalledTimes(1);

    const plus = screen.getByRole('button', { name: 'Increase size' });
    await user.click(plus);
    await user.click(plus);
    await user.click(plus);

    expect(getSizeInput().value).toEqual('18');
    // still within the debounce delay
    expect(mockCheckQuota).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Checking the quota')).toBeTruthy();

    await flushQuotaCheck();

    expect(mockCheckQuota).toHaveBeenCalledTimes(2);
    expect(mockCheckQuota).toHaveBeenLastCalledWith(namespace, workspaceName, '18Gi');
  });

  test('a stale quota response is ignored', async () => {
    let resolveFirst: (quota: WorkspaceStorageQuotaCheck) => void = () => undefined;
    mockCheckQuota.mockReturnValueOnce(new Promise(resolve => (resolveFirst = resolve)));
    mockCheckQuota.mockResolvedValueOnce(okQuota);

    renderComponent(perWorkspaceInfo);
    await flushQuotaCheck();
    await user.click(screen.getByRole('button', { name: 'Increase size' }));
    await flushQuotaCheck();

    await act(async () => resolveFirst(exceededQuota));

    expect(screen.queryByLabelText('Quota exceeded')).toBeNull();
    expect(screen.getByLabelText('Within quota')).toBeTruthy();
  });

  test('a submit error is shown inline and the modal stays open', async () => {
    mockResize.mockRejectedValue(new Error('The new size exceeds the namespace quota'));
    renderComponent(perWorkspaceInfo);
    await flushQuotaCheck();
    await user.click(screen.getByRole('checkbox'));

    await user.click(getResizeButton());

    await waitFor(() =>
      expect(screen.getByTestId('resize-error')).toHaveTextContent(
        'The new size exceeds the namespace quota',
      ),
    );
    expect(mockResize).toHaveBeenCalledWith(namespace, workspaceName, '15Gi');
    expect(mockOnClose).not.toHaveBeenCalled();
    expect(mockOnResized).not.toHaveBeenCalled();
    expect(getResizeButton()).toBeEnabled();
  });

  test('a successful submit reports the new storage info', async () => {
    const newInfo = { ...perWorkspaceInfo, requested: '16Gi', resizing: true };
    mockResize.mockResolvedValue(newInfo);
    renderComponent(perWorkspaceInfo);
    await flushQuotaCheck();
    await user.click(screen.getByRole('button', { name: 'Increase size' }));
    await flushQuotaCheck();
    await user.click(screen.getByRole('checkbox'));

    await user.click(getResizeButton());

    await waitFor(() => expect(mockOnResized).toHaveBeenCalledWith(newInfo));
    expect(mockResize).toHaveBeenCalledWith(namespace, workspaceName, '16Gi');
  });

  test('the close button closes the modal', async () => {
    renderComponent(perWorkspaceInfo);
    await flushQuotaCheck();

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('Cancel closes the modal', async () => {
    renderComponent(perWorkspaceInfo);
    await flushQuotaCheck();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockResize).not.toHaveBeenCalled();
  });
});

function getComponent(info: WorkspaceStorageInfo): React.ReactElement {
  return (
    <ResizeModal
      namespace={namespace}
      workspaceName={workspaceName}
      info={info}
      onClose={mockOnClose}
      onResized={mockOnResized}
    />
  );
}
