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

import { DevfileSchema, fetchDevfileSchema } from '@/services/backend-client/devfileSchemaApi';
import { AppThunk } from '@/store';

export const devfileSchemaRequestAction = createAction('devfileSchema/request');
export const devfileSchemaReceiveAction = createAction<DevfileSchema>('devfileSchema/receive');
export const devfileSchemaErrorAction = createAction<string>('devfileSchema/error');

const DEFAULT_VERSION = 'latest';

export const actionCreators = {
  requestDevfileSchema:
    (): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      const state = getState().devfileSchema;
      if (state.isLoading || state.schema !== undefined) {
        return;
      }

      try {
        dispatch(devfileSchemaRequestAction());

        const schema = await fetchDevfileSchema(DEFAULT_VERSION);
        dispatch(devfileSchemaReceiveAction(schema));
      } catch (e) {
        const errorMessage =
          'Failed to fetch devfile schema, reason: ' + common.helpers.errors.getMessage(e);
        dispatch(devfileSchemaErrorAction(errorMessage));
        throw e;
      }
    },
};
