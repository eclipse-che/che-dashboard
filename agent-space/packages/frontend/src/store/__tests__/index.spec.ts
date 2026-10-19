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

import { store } from '@/store';

describe('the application store', () => {
  it('mounts every slice the application reads from', () => {
    expect(Object.keys(store.getState()).sort()).toEqual([
      'bootstrap',
      'catalog',
      'samples',
      'sandboxDetails',
      'sandboxes',
    ]);
  });

  it('starts unloaded, so nothing is rendered before the bootstrap runs', () => {
    const state = store.getState();

    expect(state.bootstrap.isReady).toBe(false);
    expect(state.sandboxes.sandboxes).toEqual([]);
    expect(state.samples.samples).toEqual([]);
    expect(state.catalog.isLoaded).toBe(false);
    expect(state.sandboxDetails.sandbox).toBeUndefined();
  });

  it('ignores an action no slice handles', () => {
    const before = store.getState();

    store.dispatch({ type: 'test/unknown' });

    expect(store.getState()).toEqual(before);
  });
});
