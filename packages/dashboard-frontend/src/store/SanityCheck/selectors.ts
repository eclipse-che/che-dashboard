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

import { createSelector } from '@reduxjs/toolkit';

import { RootState } from '@/store';

const selectState = (state: RootState) => state.sanityCheck;

export const selectAsyncIsAuthorized = createSelector(
  selectState,
  async (state): Promise<boolean> => {
    try {
      const isAuthorized = await state.authorized;
      return isAuthorized;
    } catch (e) {
      return false;
    }
  },
);

export const selectSanityCheckError = createSelector(selectState, state => state.error || '');
