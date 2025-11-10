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

const selectState = (state: RootState) => state.gitConfig;

export const selectGitConfigIsLoading = createSelector(selectState, state => state.isLoading);

export const selectGitConfig = createSelector(selectState, state => state.config?.gitconfig);

export const selectGitConfigError = createSelector(selectState, state => state.error);
