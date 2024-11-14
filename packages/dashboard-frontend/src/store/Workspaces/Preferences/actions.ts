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

import common, { api } from '@eclipse-che/common';
import { createAction } from '@reduxjs/toolkit';

import {
  addTrustedSource,
  getWorkspacePreferences,
} from '@/services/backend-client/workspacePreferencesApi';
import { AppThunk } from '@/store';
import { selectDefaultNamespace } from '@/store/InfrastructureNamespaces/selectors';
import { verifyAuthorized } from '@/store/SanityCheck';
export const preferencesRequestAction = createAction('preferences/request');
export const preferencesReceiveAction = createAction<api.IWorkspacePreferences | undefined>(
  'preferences/receive',
);
export const preferencesErrorAction = createAction<string>('preferences/Error');

export const actionCreators = {
  requestPreferences: (): AppThunk => async (dispatch, getState) => {
    const defaultKubernetesNamespace = selectDefaultNamespace(getState());

    try {
      await verifyAuthorized(dispatch, getState);

      dispatch(preferencesRequestAction());

      const preferences = await getWorkspacePreferences(defaultKubernetesNamespace.name);
      dispatch(preferencesReceiveAction(preferences));
    } catch (error) {
      const errorMessage = common.helpers.errors.getMessage(error);
      dispatch(preferencesErrorAction(errorMessage));
      throw error;
    }
  },

  addTrustedSource:
    (trustedSource: api.TrustedSourceAll | api.TrustedSourceUrl): AppThunk =>
    async (dispatch, getState) => {
      const state = getState();
      const defaultKubernetesNamespace = selectDefaultNamespace(state);

      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(preferencesRequestAction());

        await addTrustedSource(defaultKubernetesNamespace.name, trustedSource);

        dispatch(preferencesReceiveAction(undefined));
      } catch (error) {
        const errorMessage = common.helpers.errors.getMessage(error);
        dispatch(preferencesErrorAction(errorMessage));
        throw error;
      }

      await dispatch(actionCreators.requestPreferences());
    },
};
