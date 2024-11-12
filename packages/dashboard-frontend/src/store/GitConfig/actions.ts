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

import common, { api, helpers } from '@eclipse-che/common';
import { createAction } from '@reduxjs/toolkit';

import { fetchGitConfig, patchGitConfig } from '@/services/backend-client/gitConfigApi';
import { AppThunk } from '@/store';
import { GitConfig } from '@/store/GitConfig';
import { selectDefaultNamespace } from '@/store/InfrastructureNamespaces/selectors';
import { verifyAuthorized } from '@/store/SanityCheck';

export const gitConfigRequestAction = createAction('gitConfig/request');
export const gitConfigReceiveAction = createAction<api.IGitConfig | undefined>('gitConfig/receive');
export const gitConfigErrorAction = createAction<string>('gitConfig/error');

export const actionCreators = {
  requestGitConfig:
    (): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      const state = getState();
      const namespace = selectDefaultNamespace(state).name;
      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(gitConfigRequestAction());

        const config = await fetchGitConfig(namespace);
        dispatch(gitConfigReceiveAction(config));
      } catch (e) {
        if (common.helpers.errors.includesAxiosResponse(e) && e.response.status === 404) {
          dispatch(gitConfigReceiveAction(undefined));
          return;
        }

        const errorMessage = helpers.errors.getMessage(e);
        dispatch(gitConfigErrorAction(errorMessage));
        throw e;
      }
    },

  updateGitConfig:
    (changedGitConfig: GitConfig): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      const state = getState();
      const namespace = selectDefaultNamespace(state).name;
      const { gitConfig } = state;
      const gitconfig = Object.assign({}, gitConfig.config || {}, {
        gitconfig: changedGitConfig,
      } as api.IGitConfig);

      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(gitConfigRequestAction());

        const updated = await patchGitConfig(namespace, gitconfig);
        dispatch(gitConfigReceiveAction(updated));
      } catch (e) {
        const errorMessage = helpers.errors.getMessage(e);
        dispatch(gitConfigErrorAction(errorMessage));
        throw e;
      }
    },
};
