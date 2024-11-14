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

import { api, helpers } from '@eclipse-che/common';

import { addSshKey, fetchSshKeys, removeSshKey } from '@/services/backend-client/sshKeysApi';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import * as infrastructureNamespacesSelectors from '@/store/InfrastructureNamespaces/selectors';
import { verifyAuthorized } from '@/store/SanityCheck';
import {
  actionCreators,
  keysAddAction,
  keysErrorAction,
  keysReceiveAction,
  keysRemoveAction,
  keysRequestAction,
} from '@/store/SshKeys/actions';

jest.mock('@eclipse-che/common');
jest.mock('@/services/backend-client/sshKeysApi');
jest.mock('@/store/SanityCheck');

const mockNamespace = 'test-namespace';
jest
  .spyOn(infrastructureNamespacesSelectors, 'selectDefaultNamespace')
  .mockReturnValue({ name: mockNamespace, attributes: { default: 'true', phase: 'Active' } });

describe('SshKeys, actions', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore({});
    jest.clearAllMocks();
  });

  describe('requestSshKeys', () => {
    it('should dispatch receive action on successful fetch', async () => {
      const mockKeys = [{ name: 'key1' }] as api.SshKey[];

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchSshKeys as jest.Mock).mockResolvedValue(mockKeys);

      await store.dispatch(actionCreators.requestSshKeys());

      const actions = store.getActions();
      expect(actions[0]).toEqual(keysRequestAction());
      expect(actions[1]).toEqual(keysReceiveAction(mockKeys));
    });

    it('should dispatch error action on failed fetch', async () => {
      const errorMessage = 'Network error';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchSshKeys as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.requestSshKeys())).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions[0]).toEqual(keysRequestAction());
      expect(actions[1]).toEqual(keysErrorAction(errorMessage));
    });
  });

  describe('addSshKey', () => {
    it('should dispatch add action on successful add', async () => {
      const mockKey = { name: 'key1' } as api.NewSshKey;
      const mockNewKey = { name: 'key1' } as api.SshKey;

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (addSshKey as jest.Mock).mockResolvedValue(mockNewKey);

      await store.dispatch(actionCreators.addSshKey(mockKey));

      const actions = store.getActions();
      expect(actions[0]).toEqual(keysRequestAction());
      expect(actions[1]).toEqual(keysAddAction(mockNewKey));
    });

    it('should dispatch error action on failed add', async () => {
      const mockKey = { name: 'key1' } as api.NewSshKey;
      const errorMessage = 'Network error';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (addSshKey as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.addSshKey(mockKey))).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions[0]).toEqual(keysRequestAction());
      expect(actions[1]).toEqual(keysErrorAction(errorMessage));
    });
  });

  describe('removeSshKey', () => {
    it('should dispatch remove action on successful remove', async () => {
      const mockKey = { name: 'key1' } as api.SshKey;

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (removeSshKey as jest.Mock).mockResolvedValue(undefined);

      await store.dispatch(actionCreators.removeSshKey(mockKey));

      const actions = store.getActions();
      expect(actions[0]).toEqual(keysRequestAction());
      expect(actions[1]).toEqual(keysRemoveAction(mockKey));
    });

    it('should dispatch error action on failed remove', async () => {
      const mockKey = { name: 'key1' } as api.SshKey;
      const errorMessage = 'Network error';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (removeSshKey as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.removeSshKey(mockKey))).rejects.toThrow(
        errorMessage,
      );

      const actions = store.getActions();
      expect(actions[0]).toEqual(keysRequestAction());
      expect(actions[1]).toEqual(keysErrorAction(errorMessage));
    });
  });
});
