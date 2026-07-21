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

import { StateMock } from '@react-mock/state';
import React from 'react';
import { Provider } from 'react-redux';
import { Store } from 'redux';

import { container } from '@/inversify.config';
import DeviceAuthTokens, { State } from '@/pages/UserPreferences/DeviceAuthTokens';
import getComponentRenderer, {
  fireEvent,
  screen,
  waitFor,
  within,
} from '@/services/__mocks__/getComponentRenderer';
import { AppAlerts } from '@/services/alerts/appAlerts';
import { AlertItem } from '@/services/helpers/types';
import { AppThunk } from '@/store';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';
import { deviceAuthTokenActionCreators } from '@/store/DeviceAuthToken';

jest.mock('@/pages/UserPreferences/DeviceAuthTokens/ConnectModal');
jest.mock('@/pages/UserPreferences/DeviceAuthTokens/DeleteModal');
jest.mock('@/pages/UserPreferences/DeviceAuthTokens/List');

console.error = jest.fn();

const mockShowAlert = jest.fn();

const mockRequestDeviceAuthTokens = jest.fn();
const mockDeleteDeviceAuthToken = jest.fn();
jest.mock('@/store/DeviceAuthToken', () => ({
  ...jest.requireActual('@/store/DeviceAuthToken'),
  deviceAuthTokenActionCreators: {
    requestDeviceAuthTokens:
      (...args): AppThunk =>
      async () =>
        mockRequestDeviceAuthTokens(...args),
    deleteDeviceAuthToken:
      (...args): AppThunk =>
      async () =>
        mockDeleteDeviceAuthToken(...args),
  } as typeof deviceAuthTokenActionCreators,
}));

const token1: { name: string; creationTimestamp: string } = {
  name: 'device-authentication-secret-abc12',
  creationTimestamp: '2024-01-01T00:00:00.000Z',
};

const { renderComponent } = getComponentRenderer(getComponent);

describe('DeviceAuthTokens', () => {
  let storeBuilder: MockStoreBuilder;
  let localState: Partial<State>;

  beforeEach(() => {
    storeBuilder = new MockStoreBuilder().withClusterConfig({ githubDeviceAuthEnabled: true });

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
    container.restore();
    localState = {};
  });

  it('should render empty state when there are no tokens', () => {
    const store = storeBuilder.build();
    renderComponent(store);

    expect(
      screen.queryByRole('heading', { name: 'No Device Authentication Tokens' }),
    ).not.toBeNull();
  });

  it('should not render empty state with tokens', () => {
    const store = storeBuilder.withDeviceAuthTokens({ tokens: [token1] }).build();
    renderComponent(store);

    expect(screen.queryByRole('heading', { name: 'No Device Authentication Tokens' })).toBeNull();
  });

  it('should request tokens on mount', async () => {
    const store = storeBuilder.build();
    renderComponent(store);

    await waitFor(() => expect(mockRequestDeviceAuthTokens).toHaveBeenCalled());
  });

  describe('connect flow', () => {
    it('should open ConnectModal when "Connect to GitHub" is clicked on empty state', () => {
      const store = storeBuilder.build();
      renderComponent(store);

      expect(screen.getByTestId('connect-modal')).toHaveAttribute('data-is-open', 'false');

      const connectBtn = screen.getByTestId('connect-github-button');
      fireEvent.click(connectBtn);

      expect(screen.getByTestId('connect-modal')).toHaveAttribute('data-is-open', 'true');
    });

    it('should close ConnectModal when cancel is clicked', () => {
      const store = storeBuilder.build();
      localState = { isConnectOpen: true };
      renderComponent(store, localState);

      expect(screen.getByTestId('connect-modal')).toHaveAttribute('data-is-open', 'true');

      const closeButton = screen.getByTestId('mock-close-button');
      fireEvent.click(closeButton);

      expect(screen.getByTestId('connect-modal')).toHaveAttribute('data-is-open', 'false');
    });

    it('should close ConnectModal and show success alert on connect success', async () => {
      const store = storeBuilder.build();
      localState = { isConnectOpen: true };
      renderComponent(store, localState);

      expect(screen.getByTestId('connect-modal')).toHaveAttribute('data-is-open', 'true');

      const successButton = screen.getByTestId('mock-success-button');
      fireEvent.click(successButton);

      await waitFor(() =>
        expect(mockShowAlert).toHaveBeenCalledWith({
          key: 'device-auth-token-connected',
          title: 'GitHub account connected successfully.',
          variant: 'success',
        } as AlertItem),
      );

      expect(screen.getByTestId('connect-modal')).toHaveAttribute('data-is-open', 'false');
    });

    it('should refresh tokens after connect success', async () => {
      const store = storeBuilder.build();
      localState = { isConnectOpen: true };
      renderComponent(store, localState);

      mockRequestDeviceAuthTokens.mockClear();
      const successButton = screen.getByTestId('mock-success-button');
      fireEvent.click(successButton);

      await waitFor(() => expect(mockRequestDeviceAuthTokens).toHaveBeenCalledTimes(1));
    });
  });

  describe('delete flow', () => {
    it('should open delete modal when delete is triggered from list', () => {
      const store = storeBuilder.withDeviceAuthTokens({ tokens: [token1] }).build();
      renderComponent(store);

      const entries = screen.getAllByTestId('device-auth-token-entry');
      const deleteButton = within(entries[0]).getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButton);

      expect(screen.queryByTestId('modal-delete-device-auth-token')).not.toBeNull();
    });

    it('should close the delete modal', () => {
      const store = storeBuilder.withDeviceAuthTokens({ tokens: [token1] }).build();
      localState = { isDeleteOpen: true, deletingTokens: [token1] };
      renderComponent(store, localState);

      expect(screen.queryByTestId('modal-delete-device-auth-token')).not.toBeNull();

      const closeButton = screen.getByTestId('close-modal');
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('modal-delete-device-auth-token')).toBeNull();
    });

    it('should delete token and show success notification', async () => {
      const store = storeBuilder.withDeviceAuthTokens({ tokens: [token1] }).build();
      localState = { isDeleteOpen: true, deletingTokens: [token1] };
      renderComponent(store, localState);

      const deleteButton = screen.getByTestId('delete-token');
      fireEvent.click(deleteButton);

      await waitFor(() => expect(mockDeleteDeviceAuthToken).toHaveBeenCalledWith(token1.name));

      await waitFor(() =>
        expect(mockShowAlert).toHaveBeenCalledWith({
          key: 'device-auth-token-deleted',
          title: 'Device Authentication token deleted successfully.',
          variant: 'success',
        } as AlertItem),
      );
    });

    it('should show error notification when delete fails', async () => {
      const store = storeBuilder.withDeviceAuthTokens({ tokens: [token1] }).build();
      localState = { isDeleteOpen: true, deletingTokens: [token1] };
      renderComponent(store, localState);

      mockDeleteDeviceAuthToken.mockRejectedValueOnce(new Error('delete-error'));

      const deleteButton = screen.getByTestId('delete-token');
      fireEvent.click(deleteButton);

      await waitFor(() =>
        expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ variant: 'danger' })),
      );
    });
  });

  describe('component updated', () => {
    it('should report error when an error occurs', async () => {
      const store = storeBuilder.build();
      const { reRenderComponent } = renderComponent(store);

      const errorMessage = 'device-auth-token-error';
      const nextStore = new MockStoreBuilder()
        .withDeviceAuthTokens({ tokens: [], error: errorMessage }, false)
        .build();
      reRenderComponent(nextStore);

      await waitFor(() => expect(mockShowAlert).toHaveBeenCalled());
      expect(mockShowAlert).toHaveBeenCalledWith({
        key: 'device-auth-token-error',
        title: errorMessage,
        variant: 'danger',
      } as AlertItem);
    });
  });
});

function getComponent(store: Store, localState?: Partial<State>): React.ReactElement {
  const component = <DeviceAuthTokens />;
  if (localState) {
    return (
      <Provider store={store}>
        <StateMock state={localState}>{component}</StateMock>
      </Provider>
    );
  }
  return (
    <Provider store={store}>
      <DeviceAuthTokens />
    </Provider>
  );
}
