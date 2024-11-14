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

import { createAction } from '@reduxjs/toolkit';

import { AppThunk } from '@/store';

export const bannerAddAction = createAction<string>('banner/add');
export const bannerRemoveAction = createAction<string>('banner/remove');

export const actionCreators = {
  addBanner:
    (message: string): AppThunk<void> =>
    dispatch => {
      dispatch(bannerAddAction(message));
    },

  removeBanner:
    (message: string): AppThunk<void> =>
    dispatch => {
      dispatch(bannerRemoveAction(message));
    },
};
