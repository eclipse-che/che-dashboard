/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
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

import { addSshKey, fetchSshKeys, removeSshKey } from '@/services/backend-client/sshKeysApi';
import { AppThunk } from '@/store';
import { selectDefaultNamespace } from '@/store/InfrastructureNamespaces/selectors';
import { verifyAuthorized } from '@/store/SanityCheck';

export const keysRequestAction = createAction('keys/request');
export const keysReceiveAction = createAction<api.SshKey[]>('keys/receive');
export const keysAddAction = createAction<api.SshKey>('keys/add');
export const keysRemoveAction = createAction<api.SshKey>('keys/remove');
export const keysErrorAction = createAction<string>('keys/error');

export const actionCreators = {
  requestSshKeys: (): AppThunk => async (dispatch, getState) => {
    const state = getState();
    const namespace = selectDefaultNamespace(state).name;
    try {
      await verifyAuthorized(dispatch, getState);

      dispatch(keysRequestAction());

      const keys = await fetchSshKeys(namespace);
      dispatch(keysReceiveAction(keys));
    } catch (e) {
      const errorMessage = helpers.errors.getMessage(e);
      dispatch(keysErrorAction(errorMessage));
      throw e;
    }
  },

  addSshKey:
    (key: api.NewSshKey): AppThunk =>
    async (dispatch, getState) => {
      const state = getState();
      const namespace = selectDefaultNamespace(state).name;
      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(keysRequestAction());

        const newSshKey = await addSshKey(namespace, key);
        dispatch(keysAddAction(newSshKey));
      } catch (e) {
        const errorMessage = helpers.errors.getMessage(e);
        dispatch(keysErrorAction(errorMessage));
        throw e;
      }
    },

  removeSshKey:
    (key: api.SshKey): AppThunk =>
    async (dispatch, getState) => {
      const state = getState();
      const namespace = selectDefaultNamespace(state).name;
      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(keysRequestAction());

        await removeSshKey(namespace, key);
        dispatch(keysRemoveAction(key));
      } catch (e) {
        const errorMessage = helpers.errors.getMessage(e);
        dispatch(keysErrorAction(errorMessage));
        throw e;
      }
    },
};
