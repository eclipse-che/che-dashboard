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

import common, { api } from '@eclipse-che/common';

import { provisionKubernetesNamespace } from '@/services/backend-client/kubernetesNamespaceApi';
import {
  deleteOAuthToken,
  getOAuthProviders,
  getOAuthToken,
} from '@/services/backend-client/oAuthApi';
import { fetchTokens } from '@/services/backend-client/personalAccessTokenApi';
import {
  deleteSkipOauthProvider,
  getWorkspacePreferences,
} from '@/services/backend-client/workspacePreferencesApi';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import {
  actionCreators,
  findUserToken,
  gitOauthDeleteAction,
  gitOauthErrorAction,
  gitOauthReceiveAction,
  gitOauthRequestAction,
  isTokenGitProvider,
  skipOauthReceiveAction,
} from '@/store/GitOauthConfig/actions';
import { IGitOauth } from '@/store/GitOauthConfig/reducer';
import * as infrastructureNamespaces from '@/store/InfrastructureNamespaces/selectors';
import { verifyAuthorized } from '@/store/SanityCheck';

jest.mock('@/services/backend-client/oAuthApi');
jest.mock('@/services/backend-client/personalAccessTokenApi');
jest.mock('@/services/backend-client/workspacePreferencesApi');
jest.mock('@/services/backend-client/kubernetesNamespaceApi');
jest.mock('@/store/SanityCheck');
jest.mock('@eclipse-che/common');

describe('GitOauthConfig', () => {
  describe('actions', () => {
    const mockNamespace = 'test-namespace';
    let store: ReturnType<typeof createMockStore>;

    beforeEach(() => {
      store = createMockStore({});
      jest.clearAllMocks();
    });

    describe('requestSkipAuthorizationProviders', () => {
      it('should dispatch receive action on successful fetch', async () => {
        const mockSkipOauthProviders = ['github', 'bitbucket'] as api.GitOauthProvider[];

        jest
          .spyOn(infrastructureNamespaces, 'selectDefaultNamespace')
          .mockReturnValue({ name: mockNamespace, attributes: { phase: 'Active' } });
        (verifyAuthorized as jest.Mock).mockResolvedValue(true);
        (getWorkspacePreferences as jest.Mock).mockResolvedValue({
          'skip-authorisation': mockSkipOauthProviders,
        });

        await store.dispatch(actionCreators.requestSkipAuthorizationProviders());

        const actions = store.getActions();
        expect(actions).toHaveLength(2);
        expect(actions[0]).toEqual(gitOauthRequestAction());
        expect(actions[1]).toEqual(skipOauthReceiveAction(mockSkipOauthProviders));
      });

      it('should dispatch error action on failed fetch', async () => {
        const errorMessage = 'Network error';

        jest
          .spyOn(infrastructureNamespaces, 'selectDefaultNamespace')
          .mockReturnValue({ name: mockNamespace, attributes: { phase: 'Active' } });
        (verifyAuthorized as jest.Mock).mockResolvedValue(true);
        (getWorkspacePreferences as jest.Mock).mockRejectedValue(new Error(errorMessage));
        (common.helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

        await expect(
          store.dispatch(actionCreators.requestSkipAuthorizationProviders()),
        ).rejects.toThrow(errorMessage);

        const actions = store.getActions();
        expect(actions).toHaveLength(2);
        expect(actions[0]).toEqual(gitOauthRequestAction());
        expect(actions[1]).toEqual(gitOauthErrorAction(errorMessage));
      });
    });

    describe('requestGitOauthConfig', () => {
      it('should dispatch receive action on successful fetch', async () => {
        const mockOAuthProviders = [
          {
            endpointUrl: 'https://github.com',
            name: 'github',
          },
        ] as IGitOauth[];
        const mockTokens = [
          {
            cheUserId: 'test-user',
            gitProvider: 'github',
            gitProviderEndpoint: 'https://github.com',
            tokenData: 'test-token-data',
            tokenName: 'test-token',
          },
        ] as api.PersonalAccessToken[];
        const mockOauthProviders = ['github'] as api.GitOauthProvider[];
        const mockOAuthToken = 'oauth-token';

        jest
          .spyOn(infrastructureNamespaces, 'selectDefaultNamespace')
          .mockReturnValue({ name: mockNamespace, attributes: { phase: 'Active' } });
        (verifyAuthorized as jest.Mock).mockResolvedValue(true);
        (getOAuthProviders as jest.Mock).mockResolvedValue(mockOAuthProviders);
        (fetchTokens as jest.Mock).mockResolvedValue(mockTokens);
        (getOAuthToken as jest.Mock).mockResolvedValue(mockOAuthToken);
        (getWorkspacePreferences as jest.Mock).mockResolvedValue({
          'skip-authorisation': mockOauthProviders,
        });

        await store.dispatch(actionCreators.requestGitOauthConfig());

        const actions = store.getActions();
        expect(actions).toHaveLength(4);
        expect(actions[0]).toEqual(gitOauthRequestAction());
        expect(actions[1]).toEqual(gitOauthRequestAction());
        expect(actions[2]).toEqual(skipOauthReceiveAction(mockOauthProviders));
        expect(actions[3]).toEqual(
          gitOauthReceiveAction({
            providersWithToken: mockOauthProviders,
            supportedGitOauth: mockOAuthProviders,
          }),
        );
      });

      it('should dispatch receive action on successful fetch with no tokens', async () => {
        const mockOAuthProviders = [
          {
            endpointUrl: 'https://github.com',
            name: 'github',
          },
        ] as IGitOauth[];
        const mockTokens = [] as api.PersonalAccessToken[];
        const mockOauthProviders = ['github'] as api.GitOauthProvider[];

        jest
          .spyOn(infrastructureNamespaces, 'selectDefaultNamespace')
          .mockReturnValue({ name: mockNamespace, attributes: { phase: 'Active' } });
        (verifyAuthorized as jest.Mock).mockResolvedValue(true);
        (getOAuthProviders as jest.Mock).mockResolvedValue(mockOAuthProviders);
        (fetchTokens as jest.Mock).mockResolvedValue(mockTokens);
        (getOAuthToken as jest.Mock).mockRejectedValue(undefined);
        (getWorkspacePreferences as jest.Mock).mockResolvedValue({
          'skip-authorisation': mockOauthProviders,
        });

        await store.dispatch(actionCreators.requestGitOauthConfig());

        const actions = store.getActions();
        expect(actions).toHaveLength(4);
        expect(actions[0]).toEqual(gitOauthRequestAction());
        expect(actions[1]).toEqual(gitOauthRequestAction());
        expect(actions[2]).toEqual(skipOauthReceiveAction(mockOauthProviders));
        expect(actions[3]).toEqual(
          gitOauthReceiveAction({
            providersWithToken: [],
            supportedGitOauth: mockOAuthProviders,
          }),
        );
      });

      it('should dispatch error action on failed fetch', async () => {
        const errorMessage = 'Network error';

        (verifyAuthorized as jest.Mock).mockResolvedValue(true);
        (getOAuthProviders as jest.Mock).mockRejectedValue(new Error(errorMessage));
        (common.helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

        await expect(store.dispatch(actionCreators.requestGitOauthConfig())).rejects.toThrow(
          errorMessage,
        );

        const actions = store.getActions();
        expect(actions).toHaveLength(2);
        expect(actions[0]).toEqual(gitOauthRequestAction());
        expect(actions[1]).toEqual(gitOauthErrorAction(errorMessage));
      });
    });

    describe('revokeOauth', () => {
      it('should dispatch delete action on successful revoke', async () => {
        const mockProvider = 'github' as api.GitOauthProvider;

        (verifyAuthorized as jest.Mock).mockResolvedValue(true);
        (deleteOAuthToken as jest.Mock).mockResolvedValue(undefined);
        (provisionKubernetesNamespace as jest.Mock).mockResolvedValue(undefined);

        await store.dispatch(actionCreators.revokeOauth(mockProvider));

        const actions = store.getActions();
        expect(actions).toHaveLength(2);
        expect(actions[0]).toEqual(gitOauthRequestAction());
        expect(actions[1]).toEqual(gitOauthDeleteAction(mockProvider));
      });

      it('should dispatch delete action on successful revoke with no tokens', async () => {
        const mockProvider = 'github' as api.GitOauthProvider;
        const errorMessage = 'OAuth token for user test-user was not found';

        (verifyAuthorized as jest.Mock).mockResolvedValue(true);
        (deleteOAuthToken as jest.Mock).mockRejectedValue(new Error(errorMessage));
        (provisionKubernetesNamespace as jest.Mock).mockResolvedValue(undefined);
        (common.helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

        await store.dispatch(actionCreators.revokeOauth(mockProvider));

        const actions = store.getActions();
        expect(actions).toHaveLength(2);
        expect(actions[0]).toEqual(gitOauthRequestAction());
        expect(actions[1]).toEqual(gitOauthDeleteAction(mockProvider));
      });

      it('should dispatch error action on failed revoke', async () => {
        const mockProvider = 'github' as api.GitOauthProvider;
        const errorMessage = 'Network error';

        (verifyAuthorized as jest.Mock).mockResolvedValue(true);
        (deleteOAuthToken as jest.Mock).mockRejectedValue(new Error(errorMessage));
        (common.helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

        await expect(store.dispatch(actionCreators.revokeOauth(mockProvider))).rejects.toThrow(
          errorMessage,
        );

        const actions = store.getActions();
        expect(actions).toHaveLength(2);
        expect(actions[0]).toEqual(gitOauthRequestAction());
        expect(actions[1]).toEqual(gitOauthErrorAction(errorMessage));
      });
    });

    describe('deleteSkipOauth', () => {
      it('should dispatch receive action on successful delete', async () => {
        const mockProvider = 'github' as api.GitOauthProvider;
        const mockSkipOauthProviders = [mockProvider];

        jest
          .spyOn(infrastructureNamespaces, 'selectDefaultNamespace')
          .mockReturnValue({ name: mockNamespace, attributes: { phase: 'Active' } });
        (verifyAuthorized as jest.Mock).mockResolvedValue(true);
        (deleteSkipOauthProvider as jest.Mock).mockResolvedValue(undefined);
        (getWorkspacePreferences as jest.Mock).mockResolvedValue({
          'skip-authorisation': mockSkipOauthProviders,
        });

        await store.dispatch(actionCreators.deleteSkipOauth(mockProvider));

        const actions = store.getActions();
        expect(actions).toHaveLength(3);
        expect(actions[0]).toEqual(gitOauthRequestAction());
        expect(actions[1]).toEqual(gitOauthRequestAction());
        expect(actions[2]).toEqual(skipOauthReceiveAction(mockSkipOauthProviders));
      });

      it('should dispatch error action on failed delete', async () => {
        const mockProvider = 'github' as api.GitOauthProvider;
        const errorMessage = 'Network error';

        jest.spyOn(infrastructureNamespaces, 'selectDefaultNamespace').mockReturnValue({
          name: mockNamespace,
          attributes: { phase: 'Active' },
        });
        (verifyAuthorized as jest.Mock).mockResolvedValue(true);
        (deleteSkipOauthProvider as jest.Mock).mockRejectedValue(new Error(errorMessage));
        (common.helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

        await expect(store.dispatch(actionCreators.deleteSkipOauth(mockProvider))).rejects.toThrow(
          errorMessage,
        );

        const actions = store.getActions();
        expect(actions[0]).toEqual(gitOauthRequestAction());
        expect(actions[1]).toEqual(gitOauthErrorAction(errorMessage));
      });
    });
  });

  describe('isTokenGitProvider', () => {
    it('should return true for oauth2 git provider', () => {
      const gitProvider = 'oauth2-provider';
      const result = isTokenGitProvider(gitProvider);
      expect(result).toBe(true);
    });

    it('should return true for bitbucket-server token format', () => {
      const gitProvider = `che-token-<user-id>-<${window.location.hostname}>`;
      const result = isTokenGitProvider(gitProvider);
      expect(result).toBe(true);
    });

    it('should return false for non-oauth2 and non-bitbucket-server token format', () => {
      const gitProvider = 'github';
      const result = isTokenGitProvider(gitProvider);
      expect(result).toBe(false);
    });

    it('should return false for invalid bitbucket-server token format', () => {
      const gitProvider = `che-token-<user-id>-<invalid-hostname>`;
      const result = isTokenGitProvider(gitProvider);
      expect(result).toBe(false);
    });
  });

  describe('findUserToken', () => {
    const mockGitOauth = {
      name: 'github',
      endpointUrl: 'https://github.com/',
    } as IGitOauth;

    // test compatibility with the old format of the git provider value
    const mockTokens = [
      {
        gitProviderEndpoint: 'https://github.com/',
        gitProvider: 'oauth2-provider',
      },
      {
        gitProviderEndpoint: 'https://bitbucket.org/',
        gitProvider: 'oauth2-provider',
      },
      {
        gitProviderEndpoint: 'https://github.com/',
        gitProvider: `che-token-<user-id>-<${window.location.hostname}>`,
      },
    ] as unknown as api.PersonalAccessToken[];

    it('should return providers with token when matching token is found', () => {
      const result = findUserToken(mockGitOauth, mockTokens);
      expect(result).toEqual(['github']);
    });

    it('should return an empty array when no matching token is found', () => {
      const mockGitOauthNoMatch = {
        name: 'gitlab',
        endpointUrl: 'https://gitlab.com/',
      } as IGitOauth;

      const result = findUserToken(mockGitOauthNoMatch, mockTokens);
      expect(result).toEqual([]);
    });

    it('should normalize endpoint URLs before comparison', () => {
      const mockGitOauthWithTrailingSlash = {
        name: 'github',
        endpointUrl: 'https://github.com/',
      } as IGitOauth;

      const mockTokensWithTrailingSlash = [
        {
          gitProviderEndpoint: 'https://github.com/',
          gitProvider: 'oauth2-provider',
          cheUserId: 'test-user',
          tokenData: 'test-token-data',
          tokenName: 'test-token',
        } as unknown as api.PersonalAccessToken,
      ];

      const result = findUserToken(mockGitOauthWithTrailingSlash, mockTokensWithTrailingSlash);
      expect(result).toEqual(['github']);
    });

    it('should handle bitbucket-server token format', () => {
      const mockGitOauthBitbucket = {
        name: 'bitbucket',
        endpointUrl: 'https://bitbucket.org/',
      } as IGitOauth;

      const mockTokensBitbucket = [
        {
          gitProviderEndpoint: 'https://bitbucket.org/',
          gitProvider: `che-token-<user-id>-<${window.location.hostname}>`,
        } as unknown as api.PersonalAccessToken,
      ];

      const result = findUserToken(mockGitOauthBitbucket, mockTokensBitbucket);
      expect(result).toEqual(['bitbucket']);
    });
  });
});
