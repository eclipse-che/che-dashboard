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

import { api, helpers } from '@eclipse-che/common';

import { provisionKubernetesNamespace } from '@/services/backend-client/kubernetesNamespaceApi';
import {
  addToken,
  fetchTokens,
  removeToken,
  updateToken,
} from '@/services/backend-client/personalAccessTokenApi';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import * as infrastructureNamespacesSelector from '@/store/InfrastructureNamespaces/selectors';
import {
  actionCreators,
  tokenAddAction,
  tokenErrorAction,
  tokenReceiveAction,
  tokenRemoveAction,
  tokenRequestAction,
  tokenUpdateAction,
} from '@/store/PersonalAccessTokens/actions';
import { verifyAuthorized } from '@/store/SanityCheck';

jest.mock('@/services/backend-client/personalAccessTokenApi');
jest.mock('@/services/backend-client/kubernetesNamespaceApi');
jest.mock('@/store/SanityCheck');
jest.mock('@eclipse-che/common');

const mockNamespace = 'test-namespace';
jest.spyOn(infrastructureNamespacesSelector, 'selectDefaultNamespace').mockReturnValue({
  name: mockNamespace,
  attributes: {
    phase: 'Active',
  },
});

describe('PersonalAccessTokens, actions', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore({});
    jest.clearAllMocks();
  });

  describe('requestTokens', () => {
    it('should dispatch receive action on successful fetch', async () => {
      const mockTokens = [{ tokenName: 'token1' }] as api.PersonalAccessToken[];

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchTokens as jest.Mock).mockResolvedValue(mockTokens);

      await store.dispatch(actionCreators.requestTokens());

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(tokenRequestAction());
      expect(actions[1]).toEqual(tokenReceiveAction(mockTokens));
    });

    it('should dispatch error action on failed fetch', async () => {
      const errorMessage = 'Network error';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchTokens as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.requestTokens())).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(tokenRequestAction());
      expect(actions[1]).toEqual(tokenErrorAction(errorMessage));
    });
  });

  describe('addToken', () => {
    it('should dispatch add action on successful add', async () => {
      const mockNewToken = { tokenName: 'token1' } as api.PersonalAccessToken;
      const mockTokens = [
        mockNewToken,
        { tokenName: 'token2' } as api.PersonalAccessToken,
      ] as api.PersonalAccessToken[];

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (addToken as jest.Mock).mockResolvedValue(mockNewToken);
      (fetchTokens as jest.Mock).mockResolvedValue(mockTokens);

      await store.dispatch(actionCreators.addToken(mockNewToken));

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(tokenRequestAction());
      expect(actions[1]).toEqual(tokenAddAction(mockNewToken));
    });

    it('should dispatch error action on failed add', async () => {
      const mockToken = { tokenName: 'token1' } as api.PersonalAccessToken;
      const errorMessage = 'Network error';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (addToken as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.addToken(mockToken))).rejects.toThrow(
        errorMessage,
      );

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(tokenRequestAction());
      expect(actions[1]).toEqual(tokenErrorAction(errorMessage));
    });

    it('should dispatch error action on successful add but token is not available', async () => {
      const mockNewToken = { tokenName: 'token1' } as api.PersonalAccessToken;
      const mockTokens = [{ tokenName: 'token2' }];

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (addToken as jest.Mock).mockResolvedValue(mockNewToken);
      (fetchTokens as jest.Mock).mockResolvedValue(mockTokens);
      (provisionKubernetesNamespace as jest.Mock).mockResolvedValue(undefined);
      (helpers.errors.getMessage as jest.Mock).mockReturnValue('Token is not valid');

      await expect(store.dispatch(actionCreators.addToken(mockNewToken))).rejects.toThrow(
        `Token "${mockNewToken.tokenName}" was not added because it is not valid.`,
      );

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(tokenRequestAction());
      expect(actions[1]).toEqual(tokenErrorAction('Token is not valid'));
    });
  });

  describe('updateToken', () => {
    it('should dispatch update action on successful update', async () => {
      const mockToken = { tokenName: 'token1' } as api.PersonalAccessToken;
      const mockUpdatedToken = { tokenName: 'token1' } as api.PersonalAccessToken;

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (updateToken as jest.Mock).mockResolvedValue(mockUpdatedToken);

      await store.dispatch(actionCreators.updateToken(mockToken));

      const actions = store.getActions();
      expect(actions[0]).toEqual(tokenRequestAction());
      expect(actions[1]).toEqual(tokenUpdateAction(mockUpdatedToken));
    });

    it('should dispatch error action on failed update', async () => {
      const mockToken = { tokenName: 'token1' } as api.PersonalAccessToken;
      const errorMessage = 'Network error';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (updateToken as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.updateToken(mockToken))).rejects.toThrow(
        errorMessage,
      );

      const actions = store.getActions();
      expect(actions[0]).toEqual(tokenRequestAction());
      expect(actions[1]).toEqual(tokenErrorAction(errorMessage));
    });
  });

  describe('removeToken', () => {
    it('should dispatch remove action on successful remove', async () => {
      const mockToken = { tokenName: 'token1' } as api.PersonalAccessToken;

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (removeToken as jest.Mock).mockResolvedValue(undefined);

      await store.dispatch(actionCreators.removeToken(mockToken));

      const actions = store.getActions();
      expect(actions[0]).toEqual(tokenRequestAction());
      expect(actions[1]).toEqual(tokenRemoveAction(mockToken));
    });

    it('should dispatch error action on failed remove', async () => {
      const mockToken = { tokenName: 'token1' } as api.PersonalAccessToken;
      const errorMessage = 'Network error';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (removeToken as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.removeToken(mockToken))).rejects.toThrow(
        errorMessage,
      );

      const actions = store.getActions();
      expect(actions[0]).toEqual(tokenRequestAction());
      expect(actions[1]).toEqual(tokenErrorAction(errorMessage));
    });
  });
});
