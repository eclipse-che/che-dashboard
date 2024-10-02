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

import * as ServerConfigApi from '@/services/backend-client/serverConfigApi';
import { AppThunk } from '@/store';
import { verifyAuthorized } from '@/store/SanityCheck';

export const serverConfigRequestAction = createAction('serverConfig/request');
export const serverConfigReceiveAction = createAction<api.IServerConfig>('serverConfig/receive');
export const serverConfigErrorAction = createAction<string>('serverConfig/error');

export const actionCreators = {
  requestServerConfig: (): AppThunk => async (dispatch, getState) => {
    try {
      await verifyAuthorized(dispatch, getState);

      dispatch(serverConfigRequestAction());

      const config = await ServerConfigApi.fetchServerConfig();

      dispatch(serverConfigReceiveAction(config));
    } catch (e) {
      const error = common.helpers.errors.getMessage(e);
      dispatch(serverConfigErrorAction(error));
      throw new Error(`Failed to fetch workspace defaults. ${error}`);
    }
  },
};
