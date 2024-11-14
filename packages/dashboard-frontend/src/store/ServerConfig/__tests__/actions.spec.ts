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

import * as ServerConfigApi from '@/services/backend-client/serverConfigApi';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import { verifyAuthorized } from '@/store/SanityCheck';
import {
  actionCreators,
  serverConfigErrorAction,
  serverConfigReceiveAction,
  serverConfigRequestAction,
} from '@/store/ServerConfig/actions';

jest.mock('@eclipse-che/common');
jest.mock('@/services/backend-client/serverConfigApi');
jest.mock('@/store/SanityCheck');

describe('ServerConfig, actions', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore({});
    jest.clearAllMocks();
  });

  describe('requestServerConfig', () => {
    it('should dispatch receive action on successful fetch', async () => {
      const mockConfig = {
        allowedSourceUrls: ['https://github.com'],
        // ...
      } as api.IServerConfig;

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (ServerConfigApi.fetchServerConfig as jest.Mock).mockResolvedValue(mockConfig);

      await store.dispatch(actionCreators.requestServerConfig());

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(serverConfigRequestAction());
      expect(actions[1]).toEqual(serverConfigReceiveAction(mockConfig));
    });

    it('should dispatch error action on failed fetch', async () => {
      const errorMessage = 'Network error';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (ServerConfigApi.fetchServerConfig as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (common.helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.requestServerConfig())).rejects.toThrow(
        `Failed to fetch workspace defaults. ${errorMessage}`,
      );

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(serverConfigRequestAction());
      expect(actions[1]).toEqual(serverConfigErrorAction(errorMessage));
    });
  });
});
