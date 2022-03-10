/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { MockStoreEnhanced } from 'redux-mock-store';
import { ThunkDispatch } from 'redux-thunk';
import { AppState } from '../..';
import { FakeStoreBuilder } from '../../__mocks__/storeBuilder';
import * as store from '..';
import {
  selectClusterConfigError,
  selectDashboardWarning,
  selectRunningWorkspacesLimit,
} from '../selectors';

describe('ClusterConfig', () => {
  it('should return an error', () => {
    const fakeStore = new FakeStoreBuilder()
      .withClusterConfig(undefined, false, 'Something unexpected')
      .build() as MockStoreEnhanced<
      AppState,
      ThunkDispatch<AppState, undefined, store.KnownAction>
    >;
    const state = fakeStore.getState();

    const selectedError = selectClusterConfigError(state);
    expect(selectedError).toEqual('Something unexpected');
  });

  it('should return a dashboard warning', () => {
    const fakeStore = new FakeStoreBuilder()
      .withClusterConfig({ dashboardWarning: 'A warning message' }, false, 'Something unexpected')
      .build() as MockStoreEnhanced<
      AppState,
      ThunkDispatch<AppState, undefined, store.KnownAction>
    >;
    const state = fakeStore.getState();

    const selectedInfo = selectDashboardWarning(state);
    expect(selectedInfo).toEqual('A warning message');
  });

  it('should return the default value for running workspaces limit', () => {
    const fakeStore = new FakeStoreBuilder()
      .withClusterConfig(undefined, false, 'Something unexpected')
      .build() as MockStoreEnhanced<
      AppState,
      ThunkDispatch<AppState, undefined, store.KnownAction>
    >;
    const state = fakeStore.getState();

    const runningLimit = selectRunningWorkspacesLimit(state);
    expect(runningLimit).toEqual(1);
  });

  it('should return a running workspaces limit', () => {
    const fakeStore = new FakeStoreBuilder()
      .withClusterConfig({ runningWorkspacesLimit: 2 }, false, 'Something unexpected')
      .build() as MockStoreEnhanced<
      AppState,
      ThunkDispatch<AppState, undefined, store.KnownAction>
    >;
    const state = fakeStore.getState();

    const runningLimit = selectRunningWorkspacesLimit(state);
    expect(runningLimit).toEqual(2);
  });
});
