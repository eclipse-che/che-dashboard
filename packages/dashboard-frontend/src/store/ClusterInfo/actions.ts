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

import common, { ClusterInfo } from '@eclipse-che/common';
import { createAction } from '@reduxjs/toolkit';

import { fetchClusterInfo } from '@/services/backend-client/clusterInfoApi';
import { AppThunk } from '@/store';
import { verifyAuthorized } from '@/store/SanityCheck';

export const clusterInfoRequestAction = createAction('clusterInfo/request');
export const clusterInfoReceiveAction = createAction<ClusterInfo>('clusterInfo/receive');
export const clusterInfoErrorAction = createAction<string>('clusterInfo/receiveError');

export const actionCreators = {
  requestClusterInfo:
    (): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(clusterInfoRequestAction());

        const clusterInfo = await fetchClusterInfo();
        dispatch(clusterInfoReceiveAction(clusterInfo));
      } catch (e) {
        const errorMessage =
          'Failed to fetch cluster properties, reason: ' + common.helpers.errors.getMessage(e);
        dispatch(clusterInfoErrorAction(errorMessage));
        throw new Error(errorMessage);
      }
    },
};
