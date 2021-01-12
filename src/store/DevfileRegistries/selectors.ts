/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { createSelector } from 'reselect';
import { AppState } from '../';

const selectState = (state: AppState) => state.devfileRegistries;

export const selectMetadata = createSelector(
  selectState,
  state => state.metadata
);

export const selectFilterValue = createSelector(
  selectState,
  state => state.filter
);

const selectFilterTokens = createSelector(
  selectFilterValue,
  value =>
    value.toLowerCase().split(/\s+/)
);

export const selectMetadataFiltered = createSelector(
  selectState,
  selectFilterTokens,
  selectMetadata,
  (state, filterTokens, metadata) => {
    if (filterTokens.length === 0) {
      return metadata;
    }
    return metadata.filter(meta => matches(meta, filterTokens));
  }
);
const matches = (meta: che.DevfileMetaData, values: string[]): boolean => {
  return values.every(value =>
    meta.displayName.toLowerCase().split(/\s+/).some(word => word.startsWith(value))
    || meta.description?.toLowerCase().split(/\s+/).some(word => word.startsWith(value))
  );
};
