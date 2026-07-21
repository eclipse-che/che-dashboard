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
import { createAction } from '@reduxjs/toolkit';

import {
  deleteDeviceAuthToken,
  DeviceCodeResponse,
  fetchDeviceAuthTokens,
  initiateDeviceAuth as apiInitiateDeviceAuth,
} from '@/services/backend-client/deviceAuthTokenApi';
import { AppThunk } from '@/store';
import { selectDefaultNamespace } from '@/store/InfrastructureNamespaces/selectors';
import { verifyAuthorized } from '@/store/SanityCheck';

export const deviceAuthTokenRequestAction = createAction('deviceAuthToken/request');
export const deviceAuthTokenReceiveAction =
  createAction<api.DeviceAuthToken[]>('deviceAuthToken/receive');
export const deviceAuthTokenRemoveAction = createAction<string>('deviceAuthToken/remove');
export const deviceAuthTokenErrorAction = createAction<string>('deviceAuthToken/error');

export const actionCreators = {
  requestDeviceAuthTokens: (): AppThunk => async (dispatch, getState) => {
    const state = getState();
    const namespace = selectDefaultNamespace(state).name;
    try {
      await verifyAuthorized(dispatch, getState);

      dispatch(deviceAuthTokenRequestAction());

      const tokens = await fetchDeviceAuthTokens(namespace);
      dispatch(deviceAuthTokenReceiveAction(tokens));
    } catch (e) {
      const errorMessage = helpers.errors.getMessage(e);
      dispatch(deviceAuthTokenErrorAction(errorMessage));
      throw e;
    }
  },

  deleteDeviceAuthToken:
    (tokenName: string): AppThunk =>
    async (dispatch, getState) => {
      const state = getState();
      const namespace = selectDefaultNamespace(state).name;
      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(deviceAuthTokenRequestAction());

        await deleteDeviceAuthToken(namespace, tokenName);
        dispatch(deviceAuthTokenRemoveAction(tokenName));
      } catch (e) {
        const errorMessage = helpers.errors.getMessage(e);
        dispatch(deviceAuthTokenErrorAction(errorMessage));
        throw e;
      }
    },

  initiateDeviceAuth: (): AppThunk<Promise<DeviceCodeResponse>> => async (dispatch, getState) => {
    const state = getState();
    const namespace = selectDefaultNamespace(state).name;
    await verifyAuthorized(dispatch, getState);
    return apiInitiateDeviceAuth(namespace);
  },
};
