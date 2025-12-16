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

import devfileApi from '@/services/devfileApi';
import { FactoryResolver } from '@/services/helpers/types';
import {
  factoryResolverErrorAction,
  factoryResolverReceiveAction,
  factoryResolverRequestAction,
} from '@/store/FactoryResolver/actions';

export type OAuthResponse = {
  attributes: {
    oauth_provider: string;
    oauth_version: string;
    oauth_authentication_url: string;
  };
  errorCode: number;
  message: string | undefined;
};

export interface Resolver extends FactoryResolver {
  devfile: devfileApi.Devfile;
  optionalFilesContent?: { [fileName: string]: { location: string; content: string } | undefined };
}

export interface State {
  isLoading: boolean;
  resolver?: Resolver;
  error?: string;
}

export const unloadedState: State = {
  isLoading: false,
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(factoryResolverRequestAction, state => {
      state.isLoading = true;
      state.error = undefined;
    })
    .addCase(factoryResolverReceiveAction, (state, action) => {
      state.isLoading = false;
      state.resolver = action.payload;
    })
    .addCase(factoryResolverErrorAction, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    }),
);
