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

import { fetchCheUserId } from '@/services/che-user-id';
import { AppThunk } from '@/store';
import { verifyAuthorized } from '@/store/SanityCheck';

export const cheUserIdRequestAction = createAction('cheUserId/request');
export const cheUserIdReceiveAction = createAction<string>('cheUserId/receive');
export const cheUserIdErrorAction = createAction<string>('cheUserId/Error');

export const actionCreators = {
  requestCheUserId: (): AppThunk => async (dispatch, getState) => {
    try {
      await verifyAuthorized(dispatch, getState);

      dispatch(cheUserIdRequestAction());

      const cheUserId = await fetchCheUserId();
      dispatch(cheUserIdReceiveAction(cheUserId));
    } catch (e) {
      const errorMessage = common.helpers.errors.getMessage(e);
      dispatch(cheUserIdErrorAction(errorMessage));
      throw e;
    }
  },
};
