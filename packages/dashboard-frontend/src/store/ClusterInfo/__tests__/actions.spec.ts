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

import common, { ClusterInfo } from '@eclipse-che/common';

import { fetchClusterInfo } from '@/services/backend-client/clusterInfoApi';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import {
  actionCreators,
  clusterInfoErrorAction,
  clusterInfoReceiveAction,
  clusterInfoRequestAction,
} from '@/store/ClusterInfo/actions';
import { verifyAuthorized } from '@/store/SanityCheck';

jest.mock('@/services/backend-client/clusterInfoApi');
jest.mock('@/store/SanityCheck');
jest.mock('@eclipse-che/common');

describe('requestClusterInfo action creator', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore({});
    jest.clearAllMocks();
  });

  it('should dispatch receive action on successful fetch', async () => {
    const mockClusterInfo = {
      applications: [
        { title: 'app1', icon: 'icon1', url: 'url1' },
        { title: 'app2', icon: 'icon2', url: 'url2' },
      ],
    } as ClusterInfo;
    (fetchClusterInfo as jest.Mock).mockResolvedValue(mockClusterInfo);
    (verifyAuthorized as jest.Mock).mockResolvedValue(true);

    await store.dispatch(actionCreators.requestClusterInfo());

    const actions = store.getActions();
    expect(actions[0]).toEqual(clusterInfoRequestAction());
    expect(actions[1]).toEqual(clusterInfoReceiveAction(mockClusterInfo));
  });

  it('should dispatch error action on failed fetch', async () => {
    const errorMessage = 'Network error';
    (fetchClusterInfo as jest.Mock).mockRejectedValue(new Error(errorMessage));
    (verifyAuthorized as jest.Mock).mockResolvedValue(true);
    (common.helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

    await expect(store.dispatch(actionCreators.requestClusterInfo())).rejects.toThrow(errorMessage);

    const actions = store.getActions();
    expect(actions[0]).toEqual(clusterInfoRequestAction());
    expect(actions[1]).toEqual(
      clusterInfoErrorAction('Failed to fetch cluster properties, reason: ' + errorMessage),
    );
  });
});
