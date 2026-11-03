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

import { createAction } from '@reduxjs/toolkit';

import { Catalog, fetchCatalog } from '@/services/catalog';
import { SandboxError, toSandboxError } from '@/services/types';
import { AppThunk } from '@/store';
import { selectConfig } from '@/store/Bootstrap';

export const catalogRequestAction = createAction('catalog/request');
export const catalogReceiveAction = createAction<Catalog>('catalog/receive');
export const catalogErrorAction = createAction<SandboxError>('catalog/receiveError');

export const actionCreators = {
  /**
   * Loads the AI-tool catalogue the dashboard publishes.
   *
   * `fetchCatalog` already swallows a failing endpoint, so an error here means
   * the request layer itself broke. Even then the create page stays usable:
   * the selectors render nothing when their part of the catalogue is empty.
   */
  requestCatalog:
    (): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      try {
        dispatch(catalogRequestAction());

        const catalog = await fetchCatalog(selectConfig(getState()).kubeApiBaseUrl);
        dispatch(catalogReceiveAction(catalog));
      } catch (e) {
        dispatch(catalogErrorAction(toSandboxError(e)));
      }
    },
};
