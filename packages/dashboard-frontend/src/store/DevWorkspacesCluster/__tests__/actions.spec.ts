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

import { isRunningDevWorkspacesClusterLimitExceeded } from '@/services/backend-client/devWorkspaceClusterApi';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import {
  actionCreators,
  devWorkspacesClusterErrorAction,
  devWorkspacesClusterReceiveAction,
  devWorkspacesClusterRequestAction,
} from '@/store/DevWorkspacesCluster/actions';
import { verifyAuthorized } from '@/store/SanityCheck';

jest.mock('@/services/backend-client/devWorkspaceClusterApi');
jest.mock('@/store/SanityCheck');
jest.mock('@eclipse-che/common');

describe('DevfileRegistries Actions', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore({});
    jest.clearAllMocks();
  });

  describe('requestRunningDevWorkspacesClusterLimitExceeded', () => {
    it('should dispatch receive action on successful fetch', async () => {
      (isRunningDevWorkspacesClusterLimitExceeded as jest.Mock).mockResolvedValue(true);
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);

      await store.dispatch(actionCreators.requestRunningDevWorkspacesClusterLimitExceeded());

      const actions = store.getActions();
      expect(actions[0]).toEqual(devWorkspacesClusterRequestAction());
      expect(actions[1]).toEqual(devWorkspacesClusterReceiveAction(true));
    });

    it('should dispatch error action on failed fetch', async () => {
      const errorMessage = 'Network error';
      (isRunningDevWorkspacesClusterLimitExceeded as jest.Mock).mockRejectedValue(
        new Error(errorMessage),
      );
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (common.helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(
        store.dispatch(actionCreators.requestRunningDevWorkspacesClusterLimitExceeded()),
      ).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions[0]).toEqual(devWorkspacesClusterRequestAction());
      expect(actions[1]).toEqual(devWorkspacesClusterErrorAction(errorMessage));
    });
  });
});
