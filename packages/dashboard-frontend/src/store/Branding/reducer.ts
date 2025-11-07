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

import { createReducer } from '@reduxjs/toolkit';

import { BrandingData } from '@/services/bootstrap/branding.constant';
import {
  brandingErrorAction,
  brandingReceiveAction,
  brandingRequestAction,
  getBrandingData,
} from '@/store/Branding/actions';

export interface State {
  isLoading: boolean;
  data: BrandingData;
  error?: string;
}

export const unloadedState: State = {
  isLoading: false,
  data: getBrandingData(),
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(brandingRequestAction, state => {
      state.isLoading = true;
      state.error = undefined;
    })
    .addCase(brandingReceiveAction, (state, action) => {
      state.isLoading = false;
      state.data = action.payload;
    })
    .addCase(brandingErrorAction, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    })
    .addDefaultCase(state => state),
);
