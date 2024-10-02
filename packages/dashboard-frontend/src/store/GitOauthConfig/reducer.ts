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

import { api } from '@eclipse-che/common';
import { createReducer } from '@reduxjs/toolkit';

import { che } from '@/services/models';
import {
  gitOauthDeleteAction,
  gitOauthErrorAction,
  gitOauthReceiveAction,
  gitOauthRequestAction,
  skipOauthReceiveAction,
} from '@/store/GitOauthConfig/actions';

export interface IGitOauth {
  name: api.GitOauthProvider;
  endpointUrl: string;
  links?: che.api.core.rest.Link[];
}

export interface State {
  isLoading: boolean;
  gitOauth: IGitOauth[];
  providersWithToken: api.GitOauthProvider[]; // authentication succeeded
  skipOauthProviders: api.GitOauthProvider[]; // authentication declined
  error: string | undefined;
}

export const unloadedState: State = {
  isLoading: false,
  gitOauth: [],
  providersWithToken: [],
  skipOauthProviders: [],
  error: undefined,
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(gitOauthRequestAction, state => {
      state.isLoading = true;
      state.error = undefined;
    })
    .addCase(gitOauthReceiveAction, (state, action) => {
      state.isLoading = false;
      state.gitOauth = action.payload.supportedGitOauth;
      state.providersWithToken = action.payload.providersWithToken;
    })
    .addCase(skipOauthReceiveAction, (state, action) => {
      state.isLoading = false;
      state.skipOauthProviders = action.payload;
    })
    .addCase(gitOauthDeleteAction, (state, action) => {
      state.isLoading = false;
      state.providersWithToken = state.providersWithToken.filter(
        provider => provider !== action.payload,
      );
    })
    .addCase(gitOauthErrorAction, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    })
    .addDefaultCase(state => state),
);
