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

import common, { ClusterConfig } from '@eclipse-che/common';

import { fetchClusterConfig } from '@/services/backend-client/clusterConfigApi';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import { bannerAddAction } from '@/store/BannerAlert/actions';
import {
  actionCreators,
  clusterConfigErrorAction,
  clusterConfigReceiveAction,
  clusterConfigRequestAction,
} from '@/store/ClusterConfig/actions';
import { verifyAuthorized } from '@/store/SanityCheck';

jest.mock('@/services/backend-client/clusterConfigApi');
jest.mock('@/store/SanityCheck');
jest.mock('@eclipse-che/common');

describe('requestClusterConfig action creator', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore({});
    jest.clearAllMocks();
  });

  it('should dispatch receive action and banner alert action on successful fetch', async () => {
    const mockClusterConfig = { dashboardWarning: 'Warning message' };
    (fetchClusterConfig as jest.Mock).mockResolvedValue(mockClusterConfig);
    (verifyAuthorized as jest.Mock).mockResolvedValue(true);

    await store.dispatch(actionCreators.requestClusterConfig());

    const actions = store.getActions();
    expect(actions[0]).toEqual(clusterConfigRequestAction());
    expect(actions[1]).toEqual(clusterConfigReceiveAction(mockClusterConfig as ClusterConfig));
    expect(actions[2]).toEqual(bannerAddAction(mockClusterConfig.dashboardWarning));
  });

  it('should dispatch error action on failed fetch', async () => {
    const errorMessage = 'Network error';
    (fetchClusterConfig as jest.Mock).mockRejectedValue(new Error(errorMessage));
    (verifyAuthorized as jest.Mock).mockResolvedValue(true);
    (common.helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

    await expect(store.dispatch(actionCreators.requestClusterConfig())).rejects.toThrow(
      errorMessage,
    );

    const actions = store.getActions();
    expect(actions[0]).toEqual(clusterConfigRequestAction());
    expect(actions[1]).toEqual(
      clusterConfigErrorAction('Failed to fetch cluster configuration, reason: ' + errorMessage),
    );
  });
});
