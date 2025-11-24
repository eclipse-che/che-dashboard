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

import { helpers } from '@eclipse-che/common';
import { createAction } from '@reduxjs/toolkit';

import { provisionKubernetesNamespace } from '@/services/backend-client/kubernetesNamespaceApi';
import { delay } from '@/services/helpers/delay';
import { signIn } from '@/services/helpers/login';
import {
  getErrorMessage,
  hasLoginPage,
  isForbidden,
  isUnauthorized,
} from '@/services/workspace-client/helpers';
import { AppThunk } from '@/store';

const secToStale = 15;
const timeToStale = secToStale * 1000;
const maxAttemptsNumber = 2;

interface BackendCheckRequestPayload {
  lastFetched: number;
}
export const backendCheckRequestAction =
  createAction<BackendCheckRequestPayload>('backendCheck/request');

export const backendCheckReceiveAction = createAction('backendCheck/receive');
export const backendCheckErrorAction = createAction<string>('backendCheck/error');

export const actionCreators = {
  testBackends: (): AppThunk => async (dispatch, getState) => {
    const { lastFetched } = getState().sanityCheck;
    const timeElapsed = Date.now() - lastFetched;
    if (timeElapsed < timeToStale) {
      return;
    }

    try {
      dispatch(
        backendCheckRequestAction({
          lastFetched: Date.now(),
        }),
      );
      for (let attempt = 1; attempt <= maxAttemptsNumber; attempt++) {
        try {
          await provisionKubernetesNamespace();
          dispatch(backendCheckReceiveAction());
          break;
        } catch (e) {
          if (attempt === maxAttemptsNumber) {
            throw e;
          }
          await delay(1000);
        }
      }
    } catch (e) {
      if (isUnauthorized(e) || (isForbidden(e) && hasLoginPage(e))) {
        signIn();
      }
      const errorMessage = getErrorMessage(e);
      dispatch(backendCheckErrorAction(errorMessage));
      console.error(helpers.errors.getMessage(e));
      if (
        helpers.errors.includesAxiosResponse(e) &&
        e.response.data.trace &&
        Array.isArray(e.response.data.trace)
      ) {
        console.error(e.response.data.trace.join('\n'));
      }
      throw errorMessage;
    }
  },
};
