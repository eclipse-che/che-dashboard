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

import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import configureMockStore from 'redux-mock-store';

import { RootState } from '@/store';
import mockThunk from '@/store/__mocks__/thunk';

/**
 * This function creates a mock store for testing only the action-related logic. It is not intended to be used for testing the reducers as it does not update the redux store.
 * https://github.com/reduxjs/redux-mock-store?tab=readme-ov-file#redux-mock-store-
 */
export function createMockStore(preloadedState: Partial<RootState> = {}) {
  const middlewares = [mockThunk];
  const mockStore = configureMockStore<
    RootState,
    ThunkDispatch<RootState, undefined, UnknownAction>
  >(middlewares);
  return mockStore(preloadedState as RootState);
}
