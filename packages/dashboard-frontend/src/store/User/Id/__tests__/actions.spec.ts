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

import mockAxios, { AxiosError } from 'axios';
import { MockStoreEnhanced } from 'redux-mock-store';
import { ThunkDispatch } from 'redux-thunk';

import { AppState } from '@/store';
import { FakeStoreBuilder } from '@/store/__mocks__/storeBuilder';
import { AUTHORIZED } from '@/store/sanityCheckMiddleware';

import * as testStore from '..';

const cheUserId = 'che-user-id';

describe('UserId store, actions', () => {
  let appStore: MockStoreEnhanced<
    AppState,
    ThunkDispatch<AppState, undefined, testStore.KnownAction>
  >;

  beforeEach(() => {
    appStore = new FakeStoreBuilder().build() as MockStoreEnhanced<
      AppState,
      ThunkDispatch<AppState, undefined, testStore.KnownAction>
    >;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create REQUEST_CHE_USER_ID and RECEIVE_CHE_USER_ID when fetching user ID', async () => {
    (mockAxios.get as jest.Mock).mockResolvedValueOnce({
      data: cheUserId,
    });

    await appStore.dispatch(testStore.actionCreators.requestCheUserId());

    const actions = appStore.getActions();
    const expectedActions: testStore.KnownAction[] = [
      {
        type: testStore.Type.REQUEST_CHE_USER_ID,
        check: AUTHORIZED,
      },
      {
        type: testStore.Type.RECEIVE_CHE_USER_ID,
        cheUserId,
      },
    ];

    expect(actions).toEqual(expectedActions);
  });

  it('should create REQUEST_CHE_USER_ID and RECEIVE_CHE_USER_ID_ERROR when fails to fetch user ID', async () => {
    (mockAxios.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      code: '500',
      message: 'Something unexpected happened.',
    } as AxiosError);

    try {
      await appStore.dispatch(testStore.actionCreators.requestCheUserId());
    } catch (e) {
      // noop
    }

    const actions = appStore.getActions();
    const expectedActions: testStore.KnownAction[] = [
      {
        type: testStore.Type.REQUEST_CHE_USER_ID,
        check: AUTHORIZED,
      },
      {
        type: testStore.Type.RECEIVE_CHE_USER_ID_ERROR,
        error: expect.stringContaining('Something unexpected happened.'),
      },
    ];

    expect(actions).toEqual(expectedActions);
  });
});
