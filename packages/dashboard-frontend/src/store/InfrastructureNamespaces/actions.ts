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

import { getKubernetesNamespace } from '@/services/backend-client/kubernetesNamespaceApi';
import { che } from '@/services/models';
import { AppThunk } from '@/store';
import { verifyAuthorized } from '@/store/SanityCheck';

export const namespaceRequestAction = createAction('namespace/request');
export const namespaceReceiveAction =
  createAction<Array<che.KubernetesNamespace>>('namespace/receive');
export const namespaceErrorAction = createAction<string>('namespace/receiveError');

export const actionCreators = {
  requestNamespaces: (): AppThunk => async (dispatch, getState) => {
    try {
      await verifyAuthorized(dispatch, getState);

      dispatch(namespaceRequestAction());

      const namespaces = await getKubernetesNamespace();
      dispatch(namespaceReceiveAction(namespaces));
    } catch (e) {
      const errorMessage =
        'Failed to fetch list of available kubernetes namespaces, reason: ' +
        common.helpers.errors.getMessage(e);
      dispatch(namespaceErrorAction(errorMessage));
      throw e;
    }
  },
};
