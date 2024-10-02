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

import { configureStore, ThunkAction, UnknownAction } from '@reduxjs/toolkit';
import logger from 'redux-logger';

import { rootReducer } from '@/store/rootReducer';

export const store = configureStore({
  reducer: rootReducer,
  middleware: getDefaultMiddleware => {
    const middlewares = getDefaultMiddleware({
      // serializableCheck: false,
      // immutableCheck: true,
    });
    if (process.env.NODE_ENV === 'development') {
      middlewares.push(logger);
    }
    return middlewares;
  },
  devTools: process.env.NODE_ENV === 'development',
});

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = Promise<void>> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  UnknownAction
>;
