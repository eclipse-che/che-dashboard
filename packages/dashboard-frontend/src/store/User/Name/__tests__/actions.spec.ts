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

import common from '@eclipse-che/common';

import { fetchUsername } from '@/services/backend-client/userProfileApi';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import { verifyAuthorized } from '@/store/SanityCheck';
import {
  actionCreators,
  usernameErrorAction,
  usernameReceiveAction,
  usernameRequestAction,
} from '@/store/User/Name/actions';

jest.mock('@eclipse-che/common');
jest.mock('@/services/backend-client/userProfileApi');
jest.mock('@/store/SanityCheck');

describe('Username, actions', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore({});
    jest.clearAllMocks();
  });

  describe('requestUsername', () => {
    it('should dispatch receive action on successful fetch', async () => {
      const username = 'test-user';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchUsername as jest.Mock).mockResolvedValue(username);

      await store.dispatch(actionCreators.requestUsername());

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(usernameRequestAction());
      expect(actions[1]).toEqual(usernameReceiveAction(username));
    });

    it('should dispatch error action on failed fetch', async () => {
      const errorMessage = 'Network error';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (fetchUsername as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (common.helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.requestUsername())).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(usernameRequestAction());
      expect(actions[1]).toEqual(usernameErrorAction(errorMessage));
    });
  });
});
