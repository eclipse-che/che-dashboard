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

import common, { ClusterConfig } from '@eclipse-che/common';
import { createAction } from '@reduxjs/toolkit';

import { fetchClusterConfig } from '@/services/backend-client/clusterConfigApi';
import { AppThunk } from '@/store';
import * as BannerAlertStore from '@/store/BannerAlert';
import { verifyAuthorized } from '@/store/SanityCheck';

export const clusterConfigRequestAction = createAction('clusterConfig/request');
export const clusterConfigReceiveAction = createAction<ClusterConfig>('clusterConfig/receive');
export const clusterConfigErrorAction = createAction<string>('clusterConfig/error');

export const actionCreators = {
  requestClusterConfig:
    (): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(clusterConfigRequestAction());

        const clusterConfig = await fetchClusterConfig();
        dispatch(clusterConfigReceiveAction(clusterConfig));

        if (clusterConfig.dashboardWarning) {
          dispatch(
            BannerAlertStore.bannerAlertActionCreators.addBanner(clusterConfig.dashboardWarning),
          );
        }
      } catch (e) {
        const errorMessage =
          'Failed to fetch cluster configuration, reason: ' + common.helpers.errors.getMessage(e);
        dispatch(clusterConfigErrorAction(errorMessage));
        throw e;
      }
    },
};
