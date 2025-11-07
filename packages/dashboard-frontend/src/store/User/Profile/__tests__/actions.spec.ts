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

import { fetchUserProfile } from '@/services/backend-client/userProfileApi';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import { verifyAuthorized } from '@/store/SanityCheck';
import {
  actionCreators,
  userProfileErrorAction,
  userProfileReceiveAction,
  userProfileRequestAction,
} from '@/store/User/Profile/actions';

jest.mock('@eclipse-che/common');
jest.mock('@/services/backend-client/userProfileApi');
jest.mock('@/store/SanityCheck');

describe('UserProfile, actions', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore({});
    jest.clearAllMocks();
  });

  describe('requestUserProfile', () => {
    it('should dispatch receive action on successful fetch', async () => {
      const mockNamespace = 'test-namespace';
      const mockUserProfile = { username: 'test-user' } as api.IUserProfile;

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchUserProfile as jest.Mock).mockResolvedValue(mockUserProfile);

      await store.dispatch(actionCreators.requestUserProfile(mockNamespace));

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(userProfileRequestAction());
      expect(actions[1]).toEqual(userProfileReceiveAction(mockUserProfile));
    });

    it('should dispatch error action on failed fetch', async () => {
      const mockNamespace = 'test-namespace';
      const errorMessage = 'Network error';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchUserProfile as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (common.helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(
        store.dispatch(actionCreators.requestUserProfile(mockNamespace)),
      ).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(userProfileRequestAction());
      expect(actions[1]).toEqual(userProfileErrorAction(errorMessage));
    });
  });
});
