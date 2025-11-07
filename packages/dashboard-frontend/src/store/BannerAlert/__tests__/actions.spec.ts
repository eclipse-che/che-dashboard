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

import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import { actionCreators, bannerAddAction, bannerRemoveAction } from '@/store/BannerAlert/actions';

describe('BannerAlert, actionCreators', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore({});
  });

  it('should dispatch bannerAddAction when addBanner is called', () => {
    const message = 'Test banner message';
    const expectedActions = [bannerAddAction(message)];

    store.dispatch(actionCreators.addBanner(message));

    expect(store.getActions()).toEqual(expectedActions);
  });

  it('should dispatch bannerRemoveAction when removeBanner is called', () => {
    const message = 'Test banner message';
    const expectedActions = [bannerRemoveAction(message)];

    store.dispatch(actionCreators.removeBanner(message));

    expect(store.getActions()).toEqual(expectedActions);
  });
});
