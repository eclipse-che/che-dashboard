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

import { FakeStoreBuilder } from '../../../store/__mocks__/storeBuilder';
import { DevWorkspaceBuilder } from '../../../store/__mocks__/devWorkspaceBuilder';
import SessionStorageService, { SessionStorageKey } from '../../session-storage';
import { WorkspaceStoppedDetector } from '../workspaceStoppedDetector';

describe('WorkspaceStoppedDetector', () => {
  it('check workspace stopped, return workspace', () => {
    const mainUrlPath = '/workspaced5858247cc74458d/';
    SessionStorageService.update(SessionStorageKey.ORIGINAL_LOCATION_PATH, mainUrlPath);

    const devWorkspaceId = 'dev-wksp-0';
    const devWorkspaces = [
      new DevWorkspaceBuilder()
        .withId(devWorkspaceId)
        .withName('dev-wksp-0')
        .withNamespace('user-dev')
        .withStatus({ mainUrl: mainUrlPath })
        .build(),
    ];

    const store = new FakeStoreBuilder().withDevWorkspaces({ workspaces: devWorkspaces }).build();

    const workspace = new WorkspaceStoppedDetector().checkWorkspaceStopped(store.getState());

    expect(workspace).toBeDefined();
    expect(workspace?.id).toBe(devWorkspaceId);
  });

  it('check workspace stopped, no workspace returned', () => {
    const mainUrlPath = '/workspaced5858247cc74458d/';
    const differentMainUrlPath = '/workspace27f154b1f05f481e/';
    SessionStorageService.update(SessionStorageKey.ORIGINAL_LOCATION_PATH, mainUrlPath);

    const devWorkspaceId = 'dev-wksp-0';
    const devWorkspaces = [
      new DevWorkspaceBuilder()
        .withId(devWorkspaceId)
        .withName('dev-wksp-0')
        .withNamespace('user-dev')
        .withStatus({ mainUrl: differentMainUrlPath })
        .build(),
    ];

    const store = new FakeStoreBuilder().withDevWorkspaces({ workspaces: devWorkspaces }).build();

    const workspace = new WorkspaceStoppedDetector().checkWorkspaceStopped(store.getState());

    expect(workspace).toBeUndefined();
  });
});
