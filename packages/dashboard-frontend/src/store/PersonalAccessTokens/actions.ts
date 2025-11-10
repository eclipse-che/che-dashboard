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

import { provisionKubernetesNamespace } from '@/services/backend-client/kubernetesNamespaceApi';
import {
  addToken,
  fetchTokens,
  removeToken,
  updateToken,
} from '@/services/backend-client/personalAccessTokenApi';
import { AppThunk } from '@/store';
import { selectDefaultNamespace } from '@/store/InfrastructureNamespaces/selectors';
import { verifyAuthorized } from '@/store/SanityCheck';

export const tokenRequestAction = createAction('token/request');
export const tokenReceiveAction = createAction<api.PersonalAccessToken[]>('token/receive');
export const tokenAddAction = createAction<api.PersonalAccessToken>('token/add');
export const tokenUpdateAction = createAction<api.PersonalAccessToken>('token/update');
export const tokenRemoveAction = createAction<api.PersonalAccessToken>('token/remove');
export const tokenErrorAction = createAction<string>('token/error');

export const actionCreators = {
  requestTokens:
    (): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      const state = getState();
      const namespace = selectDefaultNamespace(state).name;

      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(tokenRequestAction());

        const tokens = await fetchTokens(namespace);
        dispatch(tokenReceiveAction(tokens));
      } catch (e) {
        const errorMessage = helpers.errors.getMessage(e);
        dispatch(tokenErrorAction(errorMessage));
        throw e;
      }
    },

  addToken:
    (token: api.PersonalAccessToken): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      const state = getState();
      const namespace = selectDefaultNamespace(state).name;

      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(tokenRequestAction());

        const newToken = await addToken(namespace, token);

        /* request namespace provision as it triggers tokens validation */
        await provisionKubernetesNamespace();

        /* check if the new token is available */

        const allTokens = await fetchTokens(namespace);
        const tokenExists = allTokens.some(t => t.tokenName === newToken.tokenName);

        if (tokenExists) {
          dispatch(tokenAddAction(newToken));
        } else {
          const errorMessage = `Token "${newToken.tokenName}" was not added because it is not valid.`;
          throw new Error(errorMessage);
        }
      } catch (e) {
        const errorMessage = helpers.errors.getMessage(e);
        dispatch(tokenErrorAction(errorMessage));
        throw e;
      }
    },

  updateToken:
    (token: api.PersonalAccessToken): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      const state = getState();
      const namespace = selectDefaultNamespace(state).name;

      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(tokenRequestAction());

        const newToken = await updateToken(namespace, token);
        dispatch(tokenUpdateAction(newToken));
      } catch (e) {
        const errorMessage = helpers.errors.getMessage(e);
        dispatch(tokenErrorAction(errorMessage));
        throw e;
      }
    },

  removeToken:
    (token: api.PersonalAccessToken): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      const state = getState();
      const namespace = selectDefaultNamespace(state).name;

      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(tokenRequestAction());

        await removeToken(namespace, token);
        dispatch(tokenRemoveAction(token));
      } catch (e) {
        const errorMessage = helpers.errors.getMessage(e);
        dispatch(tokenErrorAction(errorMessage));
        throw e;
      }
    },
};
