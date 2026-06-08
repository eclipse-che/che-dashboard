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

import common from '@eclipse-che/common';
import { createAction } from '@reduxjs/toolkit';

import { fetchUsername } from '@/services/backend-client/userProfileApi';
import { AppThunk } from '@/store';
import { verifyAuthorized } from '@/store/SanityCheck';

export const usernameRequestAction = createAction('username/request');
export const usernameReceiveAction = createAction<string>('username/receive');
export const usernameErrorAction = createAction<string>('username/error');

export const actionCreators = {
  requestUsername: (): AppThunk => async (dispatch, getState) => {
    try {
      await verifyAuthorized(dispatch, getState);

      dispatch(usernameRequestAction());

      const username = await fetchUsername();
      dispatch(usernameReceiveAction(username));
    } catch (e) {
      const errorMessage = common.helpers.errors.getMessage(e);
      dispatch(usernameErrorAction(errorMessage));
      throw e;
    }
  },
};
