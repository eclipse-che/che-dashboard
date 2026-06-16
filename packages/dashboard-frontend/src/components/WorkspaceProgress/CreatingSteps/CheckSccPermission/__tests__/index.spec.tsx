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
import React from 'react';
import { Provider } from 'react-redux';
import { Location } from 'react-router-dom';
import { Store } from 'redux';

import { MIN_STEP_DURATION_MS } from '@/components/WorkspaceProgress/const';
import getComponentRenderer from '@/services/__mocks__/getComponentRenderer';
import { checkSccPermission } from '@/services/backend-client/sccPermissionApi';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';

import CreatingStepCheckSccPermission from '..';

jest.mock('@/services/backend-client/sccPermissionApi');

const mockCheckSccPermission = jest.mocked(checkSccPermission);

const { renderComponent } = getComponentRenderer(getComponent);

const mockLocation: Location = {
  pathname: '/',
  search: '',
  hash: '',
  state: null,
  key: 'default',
};
const mockNavigate = jest.fn();
const mockOnNextStep = jest.fn();
const mockOnRestart = jest.fn();
const mockOnError = jest.fn();
const mockOnWarning = jest.fn();
const mockOnHideError = jest.fn();

describe('Creating steps, checking SCC permission', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('skips step immediately when no SCC is configured', async () => {
    const store = new MockStoreBuilder()
      .withInfrastructureNamespace([
        { name: 'user-che', attributes: { default: 'true', phase: 'Active' } },
      ])
      .build();

    renderComponent(store);

    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    await waitFor(() => expect(mockOnNextStep).toHaveBeenCalled());
    expect(mockCheckSccPermission).not.toHaveBeenCalled();
    expect(mockOnError).not.toHaveBeenCalled();
  });

  test('completes on first poll when permitted is true', async () => {
    mockCheckSccPermission.mockResolvedValueOnce({ permitted: true });

    const store = new MockStoreBuilder()
      .withCurrentScc('container-build')
      .withInfrastructureNamespace([
        { name: 'user-che', attributes: { default: 'true', phase: 'Active' } },
      ])
      .build();

    renderComponent(store);

    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    await waitFor(() => expect(mockOnNextStep).toHaveBeenCalled());
    expect(mockCheckSccPermission).toHaveBeenCalledWith('user-che', 'container-build');
    expect(mockOnError).not.toHaveBeenCalled();
  });

  test('polls and completes when permission appears after several retries', async () => {
    mockCheckSccPermission
      .mockResolvedValueOnce({ permitted: false })
      .mockResolvedValueOnce({ permitted: false })
      .mockResolvedValueOnce({ permitted: true });

    const store = new MockStoreBuilder()
      .withCurrentScc('container-build')
      .withInfrastructureNamespace([
        { name: 'user-che', attributes: { default: 'true', phase: 'Active' } },
      ])
      .build();

    renderComponent(store);

    // advance past MIN_STEP_DURATION_MS to trigger runStep
    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    // first poll: not permitted, wait 2s
    await jest.advanceTimersByTimeAsync(2000);

    // second poll: not permitted, wait 2s
    await jest.advanceTimersByTimeAsync(2000);

    // third poll: permitted
    await waitFor(() => expect(mockOnNextStep).toHaveBeenCalled());
    expect(mockCheckSccPermission).toHaveBeenCalledTimes(3);
    expect(mockOnError).not.toHaveBeenCalled();
  });

  test('fails open on API error and proceeds with warning', async () => {
    mockCheckSccPermission.mockRejectedValueOnce(new Error('Network error'));

    const store = new MockStoreBuilder()
      .withCurrentScc('container-build')
      .withInfrastructureNamespace([
        { name: 'user-che', attributes: { default: 'true', phase: 'Active' } },
      ])
      .build();

    renderComponent(store);

    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    await waitFor(() => expect(mockOnNextStep).toHaveBeenCalled());
    expect(console.warn).toHaveBeenCalledWith(
      'SCC permission check failed, proceeding anyway:',
      expect.any(Error),
    );
    expect(mockOnError).not.toHaveBeenCalled();
  });

  test('reports error when permission is not granted within timeout', async () => {
    mockCheckSccPermission.mockResolvedValue({ permitted: false });

    const store = new MockStoreBuilder()
      .withCurrentScc('container-build')
      .withInfrastructureNamespace([
        { name: 'user-che', attributes: { default: 'true', phase: 'Active' } },
      ])
      .build();

    renderComponent(store);

    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    // advance past the 60s timeout in 10s chunks to let the polling loop iterate
    for (let i = 0; i < 12; i++) {
      await jest.advanceTimersByTimeAsync(10_000);
    }

    await waitFor(() => expect(mockOnError).toHaveBeenCalled());
    expect(mockOnNextStep).not.toHaveBeenCalled();
  });

  test('renders step title text', () => {
    const store = new MockStoreBuilder()
      .withInfrastructureNamespace([
        { name: 'user-che', attributes: { default: 'true', phase: 'Active' } },
      ])
      .build();

    renderComponent(store);

    expect(screen.getByText('Waiting for namespace provisioning to complete')).toBeInTheDocument();
  });
});

function getComponent(store: Store): React.ReactElement {
  const component = (
    <CreatingStepCheckSccPermission
      distance={0}
      hasChildren={false}
      location={mockLocation}
      navigate={mockNavigate}
      onNextStep={mockOnNextStep}
      onRestart={mockOnRestart}
      onError={mockOnError}
      onWarning={mockOnWarning}
      onHideError={mockOnHideError}
    />
  );
  return <Provider store={store}>{component}</Provider>;
}
