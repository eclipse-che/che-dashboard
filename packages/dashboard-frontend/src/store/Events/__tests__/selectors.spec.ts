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

import { WorkspaceAdapter } from '@/services/workspace-adapter';
import { RootState } from '@/store';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';
import {
  selectAllEvents,
  selectEventsError,
  selectEventsFromResourceVersion,
  selectEventsResourceVersion,
} from '@/store/Events/selectors';

describe('Events Selectors', () => {
  const mockState = {
    events: {
      events: [
        { metadata: { name: 'event0' } },
        { metadata: { name: 'event1', resourceVersion: '123' } },
        { metadata: { name: 'event2', resourceVersion: '124' } },
        { metadata: { name: 'event3', resourceVersion: '125' } },
      ],
      error: 'Something went wrong',
      resourceVersion: '125',
    },
  } as unknown as RootState;

  it('should select all events', () => {
    const result = selectAllEvents(mockState);
    expect(result).toEqual(mockState.events.events);
  });

  it('should select events from a specific resource version', () => {
    // No workspaces in store — all events pass the blocklist
    const store = new MockStoreBuilder()
      .withEvents({ events: mockState.events.events as never[], resourceVersion: '125' })
      .build();
    const fn = selectEventsFromResourceVersion(store.getState() as RootState);
    expect(fn('124')).toEqual([
      { metadata: { name: 'event2', resourceVersion: '124' } },
      { metadata: { name: 'event3', resourceVersion: '125' } },
    ]);
  });

  it('should return an empty array if resource version is invalid', () => {
    const store = new MockStoreBuilder()
      .withEvents({ events: mockState.events.events as never[], resourceVersion: '125' })
      .build();
    const fn = selectEventsFromResourceVersion(store.getState() as RootState);
    expect(fn('invalid')).toEqual([]);
  });

  it('should select events error', () => {
    expect(selectEventsError(mockState)).toEqual(mockState.events.error);
  });

  it('should select events resource version', () => {
    expect(selectEventsResourceVersion(mockState)).toEqual(mockState.events.resourceVersion);
  });

  describe('workspace filtering — blocklist approach', () => {
    // Build two real DevWorkspace objects via DevWorkspaceBuilder
    const currentDW = new DevWorkspaceBuilder()
      .withId('workspaceabc')
      .withName('my-workspace')
      .withNamespace('user-che')
      .build();
    const otherDW = new DevWorkspaceBuilder()
      .withId('workspaceXYZ')
      .withName('other-workspace')
      .withNamespace('user-che')
      .build();

    const currentWorkspaceId = WorkspaceAdapter.getId(currentDW);
    const currentWorkspaceName = 'my-workspace';

    const events = [
      // current workspace — DevWorkspace CR event
      {
        metadata: { resourceVersion: '100' },
        involvedObject: { name: 'my-workspace' },
        message: 'devworkspace event',
      },
      // current workspace — Deployment event
      {
        metadata: { resourceVersion: '101' },
        involvedObject: { name: currentWorkspaceId },
        message: 'deployment event',
      },
      // current workspace — ReplicaSet event
      {
        metadata: { resourceVersion: '102' },
        involvedObject: { name: currentWorkspaceId + '-7867c75d84' },
        message: 'replicaset event',
      },
      // current workspace — Pod event
      {
        metadata: { resourceVersion: '103' },
        involvedObject: { name: currentWorkspaceId + '-7867c75d84-kwb97' },
        message: 'pod event',
      },
      // generic cluster event (not tied to any workspace)
      {
        metadata: { resourceVersion: '104' },
        involvedObject: { name: 'some-other-resource' },
        message: 'generic event',
      },
      // other workspace — DevWorkspace CR event
      {
        metadata: { resourceVersion: '105' },
        involvedObject: { name: 'other-workspace' },
        message: 'other devworkspace event',
      },
      // other workspace — pod event
      {
        metadata: { resourceVersion: '106' },
        involvedObject: { name: WorkspaceAdapter.getId(otherDW) + '-abc123-pod1' },
        message: 'other pod event',
      },
    ];

    let state: RootState;
    beforeEach(() => {
      state = new MockStoreBuilder()
        .withDevWorkspaces({ workspaces: [currentDW, otherDW] })
        .withEvents({ events: events as never[], resourceVersion: '106' })
        .build()
        .getState() as RootState;
    });

    it('should show current workspace DevWorkspace events', () => {
      const result = selectEventsFromResourceVersion(state)(
        '100',
        currentWorkspaceId,
        currentWorkspaceName,
      );
      expect(result.map(e => (e as { message: string }).message)).toContain('devworkspace event');
    });

    it('should show current workspace Deployment events', () => {
      const result = selectEventsFromResourceVersion(state)(
        '100',
        currentWorkspaceId,
        currentWorkspaceName,
      );
      expect(result.map(e => (e as { message: string }).message)).toContain('deployment event');
    });

    it('should show current workspace ReplicaSet events', () => {
      const result = selectEventsFromResourceVersion(state)(
        '100',
        currentWorkspaceId,
        currentWorkspaceName,
      );
      expect(result.map(e => (e as { message: string }).message)).toContain('replicaset event');
    });

    it('should show current workspace Pod events', () => {
      const result = selectEventsFromResourceVersion(state)(
        '100',
        currentWorkspaceId,
        currentWorkspaceName,
      );
      expect(result.map(e => (e as { message: string }).message)).toContain('pod event');
    });

    it('should show generic cluster events not tied to any workspace', () => {
      const result = selectEventsFromResourceVersion(state)(
        '100',
        currentWorkspaceId,
        currentWorkspaceName,
      );
      expect(result.map(e => (e as { message: string }).message)).toContain('generic event');
    });

    it('should hide other workspace DevWorkspace events', () => {
      const result = selectEventsFromResourceVersion(state)(
        '100',
        currentWorkspaceId,
        currentWorkspaceName,
      );
      expect(result.map(e => (e as { message: string }).message)).not.toContain(
        'other devworkspace event',
      );
    });

    it('should hide other workspace Pod events', () => {
      const result = selectEventsFromResourceVersion(state)(
        '100',
        currentWorkspaceId,
        currentWorkspaceName,
      );
      expect(result.map(e => (e as { message: string }).message)).not.toContain('other pod event');
    });
  });
});
