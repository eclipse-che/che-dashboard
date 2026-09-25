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

const selectState = (state: RootState) => state.personalAccessToken;

export const selectPersonalAccessTokensIsLoading = createSelector(
  selectState,
  state => state.isLoading,
);

/**
 * Returns personal access tokens only. Tokens provisioned by the Git OAuth flow are managed
 * from the Git Services tab and are filtered out here.
 */
export const selectPersonalAccessTokens = createSelector(selectState, state =>
  state.tokens.filter(token => !token.isOauth),
);

/**
 * Returns tokens provisioned by the Git OAuth flow only.
 */
export const selectOauthTokens = createSelector(selectState, state =>
  state.tokens.filter(token => token.isOauth),
);

export const selectPersonalAccessTokensError = createSelector(selectState, state => state.error);
