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

const selectState = (state: RootState) => state.catalog;

export const selectCatalogIsLoading = createSelector(selectState, state => state.isLoading);

/**
 * Whether the catalogue has been answered for, successfully or not.
 *
 * A sandbox takes its agents from here and only here, at the moment it is
 * created, so anything creating one has to know whether an empty catalogue
 * means "this cluster publishes no AI tool" or "the answer is still on its
 * way".
 */
export const selectCatalogIsLoaded = createSelector(selectState, state => state.isLoaded);

export const selectCatalogError = createSelector(selectState, state => state.error);

export const selectAiProviders = createSelector(selectState, state => state.catalog.aiProviders);

export const selectAiTools = createSelector(selectState, state => state.catalog.aiTools);
