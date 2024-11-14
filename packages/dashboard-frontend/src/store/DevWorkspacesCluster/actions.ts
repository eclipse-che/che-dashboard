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

import common from '@eclipse-che/common';
import { createAction } from '@reduxjs/toolkit';

import { isRunningDevWorkspacesClusterLimitExceeded } from '@/services/backend-client/devWorkspaceClusterApi';
import { AppThunk } from '@/store';
import { verifyAuthorized } from '@/store/SanityCheck';

export const devWorkspacesClusterRequestAction = createAction('devWorkspaceCluster/request');
export const devWorkspacesClusterReceiveAction = createAction<boolean>(
  'devWorkspaceCluster/receive',
);
export const devWorkspacesClusterErrorAction = createAction<string>('devWorkspaceCluster/error');

export const actionCreators = {
  requestRunningDevWorkspacesClusterLimitExceeded:
    (): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(devWorkspacesClusterRequestAction());

        const isLimitExceeded = await isRunningDevWorkspacesClusterLimitExceeded();
        dispatch(devWorkspacesClusterReceiveAction(isLimitExceeded));
      } catch (e) {
        dispatch(devWorkspacesClusterErrorAction(common.helpers.errors.getMessage(e)));
        throw e;
      }
    },
};
