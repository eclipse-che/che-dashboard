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

import common from '@eclipse-che/common';

import { fetchCheUserId } from '@/services/che-user-id';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import { verifyAuthorized } from '@/store/SanityCheck';
import {
  actionCreators,
  cheUserIdErrorAction,
  cheUserIdReceiveAction,
  cheUserIdRequestAction,
} from '@/store/User/Id/actions';

jest.mock('@eclipse-che/common');
jest.mock('@/services/che-user-id');
jest.mock('@/store/SanityCheck');

describe('CheUserId, actions', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore({});
    jest.clearAllMocks();
  });

  describe('requestCheUserId', () => {
    it('should dispatch receive action on successful fetch', async () => {
      const mockCheUserId = 'test-user-id';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchCheUserId as jest.Mock).mockResolvedValue(mockCheUserId);

      await store.dispatch(actionCreators.requestCheUserId());

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(cheUserIdRequestAction());
      expect(actions[1]).toEqual(cheUserIdReceiveAction(mockCheUserId));
    });

    it('should dispatch error action on failed fetch', async () => {
      const errorMessage = 'Network error';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchCheUserId as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (common.helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.requestCheUserId())).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(cheUserIdRequestAction());
      expect(actions[1]).toEqual(cheUserIdErrorAction(errorMessage));
    });
  });
});
