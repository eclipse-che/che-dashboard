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

import { api } from '@eclipse-che/common';
import React from 'react';
import { Provider } from 'react-redux';

import { ConnectModal } from '@/pages/UserPreferences/DeviceAuthTokens/ConnectModal';
import getComponentRenderer, { screen, waitFor } from '@/services/__mocks__/getComponentRenderer';
import { DeviceCodeResponse, pollDeviceAuth } from '@/services/backend-client/deviceAuthTokenApi';
import { AppThunk } from '@/store';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';
import { deviceAuthTokenActionCreators } from '@/store/DeviceAuthToken';

jest.mock('@/services/backend-client/deviceAuthTokenApi');
jest.mock('@/store/DeviceAuthToken', () => ({
  ...jest.requireActual('@/store/DeviceAuthToken'),
  deviceAuthTokenActionCreators: {
    initiateDeviceAuth: (): AppThunk<Promise<DeviceCodeResponse>> => async () => ({
      deviceCode: 'dev-code-123',
      userCode: 'ABCD-1234',
      verificationUri: 'https://github.com/login/device',
      interval: 5,
    }),
  } as typeof deviceAuthTokenActionCreators,
}));

const mockOnCloseModal = jest.fn();
const mockOnSuccess = jest.fn();

const newToken: api.DeviceAuthToken = {
  name: 'device-authentication-secret-abc12',
  provider: 'github',
};

const { renderComponent } = getComponentRenderer(getComponent);

function getComponent(isOpen: boolean) {
  const store = new MockStoreBuilder().build();
  return (
    <Provider store={store}>
      <ConnectModal
        isOpen={isOpen}
        namespace="test-namespace"
        onCloseModal={mockOnCloseModal}
        onSuccess={mockOnSuccess}
      />
    </Provider>
  );
}

describe('ConnectModal', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should render the user code when open', async () => {
    renderComponent(true);
    await waitFor(() => screen.getByTestId('user-code'));
    expect(screen.getByTestId('user-code')).toHaveTextContent('ABCD-1234');
  });

  it('should call onSuccess when poll returns authorized', async () => {
    (pollDeviceAuth as jest.Mock).mockResolvedValue({ status: 'authorized', token: newToken });
    renderComponent(true);
    await waitFor(() => screen.getByTestId('user-code'));
    jest.runAllTimers();
    await waitFor(() => expect(mockOnSuccess).toHaveBeenCalledWith(newToken));
  });

  it('should show error when poll returns expired', async () => {
    (pollDeviceAuth as jest.Mock).mockResolvedValue({ status: 'expired' });
    renderComponent(true);
    await waitFor(() => screen.getByTestId('user-code'));
    jest.runAllTimers();
    await waitFor(() => screen.getByTestId('connect-error'));
    expect(screen.getByTestId('connect-error')).toHaveTextContent('expired');
  });

  it('should call onCloseModal when Cancel is clicked', async () => {
    (pollDeviceAuth as jest.Mock).mockResolvedValue({ status: 'pending' });
    renderComponent(true);
    await waitFor(() => screen.getByTestId('cancel-button'));
    screen.getByTestId('cancel-button').click();
    expect(mockOnCloseModal).toHaveBeenCalled();
  });

  it('should increase poll interval by 5s on slow_down', async () => {
    (pollDeviceAuth as jest.Mock).mockResolvedValue({ status: 'slow_down' });
    renderComponent(true);
    await waitFor(() => screen.getByTestId('user-code'));
    // advance by original 5s interval
    jest.advanceTimersByTime(5000);
    await waitFor(() => expect(pollDeviceAuth).toHaveBeenCalled());
    const callCount = (pollDeviceAuth as jest.Mock).mock.calls.length;
    // advance by 5s (original) — should NOT trigger yet (interval is now 10s)
    jest.advanceTimersByTime(5000);
    await Promise.resolve(); // flush microtasks
    // advance remaining 5s to complete the 10s interval
    jest.advanceTimersByTime(5000);
    await waitFor(() =>
      expect((pollDeviceAuth as jest.Mock).mock.calls.length).toBeGreaterThan(callCount),
    );
  });
});
