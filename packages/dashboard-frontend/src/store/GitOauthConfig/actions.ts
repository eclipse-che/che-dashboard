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

import common, { api } from '@eclipse-che/common';
import { createAction } from '@reduxjs/toolkit';

import { provisionKubernetesNamespace } from '@/services/backend-client/kubernetesNamespaceApi';
import { deleteOAuthToken, getOAuthProviders } from '@/services/backend-client/oAuthApi';
import { fetchTokens } from '@/services/backend-client/personalAccessTokenApi';
import {
  deleteSkipOauthProvider,
  getWorkspacePreferences,
} from '@/services/backend-client/workspacePreferencesApi';
import { AppThunk } from '@/store';
import { IGitOauth } from '@/store/GitOauthConfig';
import { selectDefaultNamespace } from '@/store/InfrastructureNamespaces/selectors';
import { verifyAuthorized } from '@/store/SanityCheck';

export const gitOauthRequestAction = createAction('gitOauth/request');

interface GitOAuthReceivePayload {
  supportedGitOauth: IGitOauth[];
  providersWithToken: api.GitOauthProvider[];
}
export const gitOauthReceiveAction = createAction<GitOAuthReceivePayload>('gitOauth/receive');

export const gitOauthDeleteAction = createAction<api.GitOauthProvider>('gitOauth/delete');

export const gitOauthErrorAction = createAction<string>('gitOauth/error');

export const skipOauthReceiveAction = createAction<api.GitOauthProvider[]>('skipOauth/receive');

export const actionCreators = {
  requestSkipAuthorizationProviders:
    (): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      const defaultKubernetesNamespace = selectDefaultNamespace(getState());
      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(gitOauthRequestAction());

        const devWorkspacePreferences = await getWorkspacePreferences(
          defaultKubernetesNamespace.name,
        );

        const skipOauthProviders = devWorkspacePreferences['skip-authorisation'] || [];
        dispatch(skipOauthReceiveAction(skipOauthProviders));
      } catch (e) {
        const errorMessage = common.helpers.errors.getMessage(e);
        dispatch(gitOauthErrorAction(errorMessage));
        throw e;
      }
    },

  requestGitOauthConfig:
    (): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      const providersWithToken: api.GitOauthProvider[] = [];
      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(gitOauthRequestAction());

        const supportedGitOauth = await getOAuthProviders();

        const defaultKubernetesNamespace = selectDefaultNamespace(getState());
        const tokens = await fetchTokens(defaultKubernetesNamespace.name);

        for (const gitOauth of supportedGitOauth) {
          // check if there is an oAuth token in a Kubernetes Secret
          providersWithToken.push(...findOauthToken(gitOauth, tokens));
        }
        await dispatch(actionCreators.requestSkipAuthorizationProviders());

        dispatch(
          gitOauthReceiveAction({
            providersWithToken,
            supportedGitOauth,
          }),
        );
      } catch (e) {
        const errorMessage = common.helpers.errors.getMessage(e);
        dispatch(gitOauthErrorAction(errorMessage));
        throw e;
      }
    },

  revokeOauth:
    (oauthProvider: api.GitOauthProvider): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(gitOauthRequestAction());

        await deleteOAuthToken(oauthProvider);

        // request namespace provision as it triggers tokens validation
        try {
          await provisionKubernetesNamespace();
          /* c8 ignore next 3 */
        } catch (e) {
          // no-op
        }

        dispatch(gitOauthDeleteAction(oauthProvider));
      } catch (e) {
        const errorMessage = common.helpers.errors.getMessage(e);
        if (/^OAuth token for user .* was not found$/.test(errorMessage)) {
          dispatch(gitOauthDeleteAction(oauthProvider));
        } else {
          dispatch(gitOauthErrorAction(errorMessage));
          throw e;
        }
      }
    },

  deleteSkipOauth:
    (oauthProvider: api.GitOauthProvider): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      const defaultKubernetesNamespace = selectDefaultNamespace(getState());
      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(gitOauthRequestAction());

        await deleteSkipOauthProvider(defaultKubernetesNamespace.name, oauthProvider);
        await dispatch(actionCreators.requestSkipAuthorizationProviders());
      } catch (e) {
        const errorMessage = common.helpers.errors.getMessage(e);
        dispatch(gitOauthErrorAction(errorMessage));
        throw e;
      }
    },
};

/**
 * Check the user's token in a Kubernetes Secret
 */
export function findOauthToken(gitOauth: IGitOauth, tokens: api.PersonalAccessToken[]) {
  const providersWithToken: api.GitOauthProvider[] = [];

  const normalizedGitOauthEndpoint = gitOauth.endpointUrl.endsWith('/')
    ? gitOauth.endpointUrl.slice(0, -1)
    : gitOauth.endpointUrl;

  for (const token of tokens) {
    const normalizedTokenGitProviderEndpoint = token.gitProviderEndpoint.endsWith('/')
      ? token.gitProviderEndpoint.slice(0, -1)
      : token.gitProviderEndpoint;

    // compare Git OAuth Endpoint url ONLY with OAuth tokens
    if (token.isOauth && normalizedGitOauthEndpoint === normalizedTokenGitProviderEndpoint) {
      providersWithToken.push(gitOauth.name);
      break;
    }
  }
  return providersWithToken;
}
