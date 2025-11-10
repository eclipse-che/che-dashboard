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

import { getAxiosInstance } from '@/services/axios-wrapper/getAxiosInstance';
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
        timeouts: {
          axiosRequestTimeout: 30000,
        },
        // ...
      } as api.IServerConfig;

      expect(getAxiosInstance().defaults.timeout).toEqual(15000);

      (ServerConfigApi.fetchServerConfig as jest.Mock).mockResolvedValue(mockConfig);

      await store.dispatch(actionCreators.requestServerConfig());

      expect(getAxiosInstance().defaults.timeout).toEqual(30000);
      expect(verifyAuthorized).not.toHaveBeenCalled();

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(serverConfigRequestAction());
      expect(actions[1]).toEqual(serverConfigReceiveAction(mockConfig));
    });

    it('should dispatch error action on failed fetch', async () => {
      const errorMessage = 'Network error';

      (ServerConfigApi.fetchServerConfig as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (common.helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);

      await expect(store.dispatch(actionCreators.requestServerConfig())).rejects.toThrow(
        `Failed to fetch workspace defaults. ${errorMessage}`,
      );

      expect(verifyAuthorized).toHaveBeenCalled();

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(serverConfigRequestAction());
      expect(actions[1]).toEqual(serverConfigErrorAction(errorMessage));
    });
  });
});
