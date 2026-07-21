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

import { api, helpers } from '@eclipse-che/common';

import {
  deleteDeviceAuthToken,
  fetchDeviceAuthTokens,
  initiateDeviceAuth as apiInitiateDeviceAuth,
} from '@/services/backend-client/deviceAuthTokenApi';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import {
  actionCreators,
  deviceAuthTokenErrorAction,
  deviceAuthTokenReceiveAction,
  deviceAuthTokenRemoveAction,
  deviceAuthTokenRequestAction,
} from '@/store/DeviceAuthToken/actions';
import * as infrastructureNamespacesSelectors from '@/store/InfrastructureNamespaces/selectors';
import { verifyAuthorized } from '@/store/SanityCheck';

jest.mock('@eclipse-che/common');
jest.mock('@/services/backend-client/deviceAuthTokenApi');
jest.mock('@/store/SanityCheck');

const mockNamespace = 'test-namespace';
jest
  .spyOn(infrastructureNamespacesSelectors, 'selectDefaultNamespace')
  .mockReturnValue({ name: mockNamespace, attributes: { default: 'true', phase: 'Active' } });

const token1: api.DeviceAuthToken = { name: 'device-authentication-secret-abc12' };

describe('DeviceAuthToken, actions', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore({});
    jest.clearAllMocks();
  });

  describe('requestDeviceAuthTokens', () => {
    it('should dispatch receive action on successful fetch', async () => {
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchDeviceAuthTokens as jest.Mock).mockResolvedValue([token1]);

      await store.dispatch(actionCreators.requestDeviceAuthTokens());

      const actions = store.getActions();
      expect(actions[0]).toEqual(deviceAuthTokenRequestAction());
      expect(actions[1]).toEqual(deviceAuthTokenReceiveAction([token1]));
    });

    it('should dispatch error action on failed fetch', async () => {
      const errorMessage = 'Network error';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchDeviceAuthTokens as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.requestDeviceAuthTokens())).rejects.toThrow(
        errorMessage,
      );

      const actions = store.getActions();
      expect(actions[0]).toEqual(deviceAuthTokenRequestAction());
      expect(actions[1]).toEqual(deviceAuthTokenErrorAction(errorMessage));
    });
  });

  describe('deleteDeviceAuthToken', () => {
    it('should dispatch remove action on successful delete', async () => {
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (deleteDeviceAuthToken as jest.Mock).mockResolvedValue(undefined);

      await store.dispatch(actionCreators.deleteDeviceAuthToken(token1.name));

      const actions = store.getActions();
      expect(actions[0]).toEqual(deviceAuthTokenRequestAction());
      expect(actions[1]).toEqual(deviceAuthTokenRemoveAction(token1.name));
    });

    it('should dispatch error action on failed delete', async () => {
      const errorMessage = 'Delete failed';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (deleteDeviceAuthToken as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(
        store.dispatch(actionCreators.deleteDeviceAuthToken(token1.name)),
      ).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions[0]).toEqual(deviceAuthTokenRequestAction());
      expect(actions[1]).toEqual(deviceAuthTokenErrorAction(errorMessage));
    });
  });

  describe('initiateDeviceAuth', () => {
    it('should return DeviceCodeResponse on success', async () => {
      const response = {
        deviceCode: 'dev-code',
        userCode: 'ABCD-1234',
        verificationUri: 'https://github.com/login/device',
        interval: 5,
      };
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (apiInitiateDeviceAuth as jest.Mock).mockResolvedValue(response);

      const result = await store.dispatch(actionCreators.initiateDeviceAuth());
      expect(result).toEqual(response);
      expect(apiInitiateDeviceAuth).toHaveBeenCalledWith(mockNamespace);
    });

    it('should throw on API failure', async () => {
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (apiInitiateDeviceAuth as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(store.dispatch(actionCreators.initiateDeviceAuth())).rejects.toThrow(
        'Network error',
      );
    });
  });
});
