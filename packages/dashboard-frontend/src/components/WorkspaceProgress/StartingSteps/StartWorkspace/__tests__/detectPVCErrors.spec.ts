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

import { CoreV1Event } from '@kubernetes/client-node';

import { hasPVCErrors } from '@/components/WorkspaceProgress/StartingSteps/StartWorkspace/detectPVCErrors';
import { constructWorkspace, Workspace } from '@/services/workspace-adapter';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';

describe('detectPVCErrors', () => {
  let workspace: Workspace;
  let startedWorkspaces: { [key: string]: string };
  const eventsFromResourceVersionFn = jest.fn<CoreV1Event[], [string]>();

  beforeEach(() => {
    const devWorkspace = new DevWorkspaceBuilder()
      .withName('test-workspace')
      .withId('workspace-id-123')
      .withUID('uid-123')
      .build();
    workspace = constructWorkspace(devWorkspace);
    startedWorkspaces = { 'uid-123': 'resource-version-100' };
    jest.clearAllMocks();
    eventsFromResourceVersionFn.mockReturnValue([]);
  });

  describe('hasPVCErrors', () => {
    it('should return false when workspace is undefined', () => {
      expect(hasPVCErrors(undefined, startedWorkspaces, eventsFromResourceVersionFn)).toBe(false);
    });

    it('should return false for ephemeral storage', () => {
      workspace.storageType = 'ephemeral';

      expect(hasPVCErrors(workspace, startedWorkspaces, eventsFromResourceVersionFn)).toBe(false);
      expect(eventsFromResourceVersionFn).not.toHaveBeenCalled();
    });

    it('should return false when the workspace has no start resource version', () => {
      expect(hasPVCErrors(workspace, {}, eventsFromResourceVersionFn)).toBe(false);
      expect(eventsFromResourceVersionFn).not.toHaveBeenCalled();
    });

    it('should query events from the recorded resource version', () => {
      hasPVCErrors(workspace, startedWorkspaces, eventsFromResourceVersionFn);

      expect(eventsFromResourceVersionFn).toHaveBeenCalledWith('resource-version-100');
    });

    it('should return false when no events match', () => {
      eventsFromResourceVersionFn.mockReturnValue([]);

      expect(hasPVCErrors(workspace, startedWorkspaces, eventsFromResourceVersionFn)).toBe(false);
    });

    it('should return false when the event reason is not Failed', () => {
      eventsFromResourceVersionFn.mockReturnValue([
        {
          metadata: { name: 'workspace-id-123-pod' },
          reason: 'Warning',
          message: 'failed to create subPath directory for volumeMount',
        } as CoreV1Event,
      ]);

      expect(hasPVCErrors(workspace, startedWorkspaces, eventsFromResourceVersionFn)).toBe(false);
    });

    it('should return false for an unrelated Failed event', () => {
      eventsFromResourceVersionFn.mockReturnValue([
        {
          metadata: { name: 'workspace-id-123-pod' },
          reason: 'Failed',
          message: 'Some other error message',
        } as CoreV1Event,
      ]);

      expect(hasPVCErrors(workspace, startedWorkspaces, eventsFromResourceVersionFn)).toBe(false);
    });

    it('should ignore Failed events belonging to another workspace', () => {
      eventsFromResourceVersionFn.mockReturnValue([
        {
          metadata: { name: 'other-workspace-event' },
          reason: 'Failed',
          message: 'failed to create subPath directory for volumeMount',
        } as CoreV1Event,
      ]);

      expect(hasPVCErrors(workspace, startedWorkspaces, eventsFromResourceVersionFn)).toBe(false);
    });

    it('should detect "failed to create subPath directory for volumeMount"', () => {
      eventsFromResourceVersionFn.mockReturnValue([
        {
          metadata: { name: 'workspace-id-123-pod' },
          reason: 'Failed',
          message: 'failed to create subPath directory for volumeMount "projects"',
        } as CoreV1Event,
      ]);

      expect(hasPVCErrors(workspace, startedWorkspaces, eventsFromResourceVersionFn)).toBe(true);
    });

    it('should detect "error for volume"', () => {
      eventsFromResourceVersionFn.mockReturnValue([
        {
          metadata: { name: 'workspace-id-123-pod' },
          reason: 'Failed',
          message: 'error for volume "pvc-claim": disk quota exceeded',
        } as CoreV1Event,
      ]);

      expect(hasPVCErrors(workspace, startedWorkspaces, eventsFromResourceVersionFn)).toBe(true);
    });

    it('should detect "no space left on device"', () => {
      // matches only the third pattern - neither of the two patterns restored
      // from #1421 appears in this message
      eventsFromResourceVersionFn.mockReturnValue([
        {
          metadata: { name: 'workspace-id-123-pod' },
          reason: 'Failed',
          message: 'Error: container create failed: write /data/x: no space left on device',
        } as CoreV1Event,
      ]);

      expect(hasPVCErrors(workspace, startedWorkspaces, eventsFromResourceVersionFn)).toBe(true);
    });

    it('should tolerate an event with no message', () => {
      eventsFromResourceVersionFn.mockReturnValue([
        {
          metadata: { name: 'workspace-id-123-pod' },
          reason: 'Failed',
        } as CoreV1Event,
      ]);

      expect(hasPVCErrors(workspace, startedWorkspaces, eventsFromResourceVersionFn)).toBe(false);
    });

    it('should tolerate an event with no metadata name', () => {
      eventsFromResourceVersionFn.mockReturnValue([
        {
          metadata: {},
          reason: 'Failed',
          message: 'failed to create subPath directory for volumeMount',
        } as CoreV1Event,
      ]);

      expect(hasPVCErrors(workspace, startedWorkspaces, eventsFromResourceVersionFn)).toBe(false);
    });

    it('should detect errors when the storage type is unset', () => {
      expect(workspace.storageType).toBe('');
      eventsFromResourceVersionFn.mockReturnValue([
        {
          metadata: { name: 'workspace-id-123-pod' },
          reason: 'Failed',
          message: 'failed to create subPath directory for volumeMount',
        } as CoreV1Event,
      ]);

      expect(hasPVCErrors(workspace, startedWorkspaces, eventsFromResourceVersionFn)).toBe(true);
    });
  });
});
