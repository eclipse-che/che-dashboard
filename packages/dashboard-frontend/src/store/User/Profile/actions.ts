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

import { fetchUserProfile } from '@/services/backend-client/userProfileApi';
import { AppThunk } from '@/store';
import { verifyAuthorized } from '@/store/SanityCheck';

export const userProfileRequestAction = createAction('userProfile/request');
export const userProfileReceiveAction = createAction<api.IUserProfile>('userProfile/receive');
export const userProfileErrorAction = createAction<string>('userProfile/error');

export const actionCreators = {
  requestUserProfile:
    (namespace: string): AppThunk =>
    async (dispatch, getState) => {
      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(userProfileRequestAction());

        const userProfile = await fetchUserProfile(namespace);
        dispatch(userProfileReceiveAction(userProfile));
      } catch (e) {
        const errorMessage = common.helpers.errors.getMessage(e);
        dispatch(userProfileErrorAction(errorMessage));
        throw e;
      }
    },
};
