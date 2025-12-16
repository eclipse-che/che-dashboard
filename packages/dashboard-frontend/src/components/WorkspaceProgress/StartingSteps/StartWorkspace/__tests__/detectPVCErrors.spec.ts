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
  const startedWorkspaces: { [key: string]: string } = {};
  const eventsFromResourceVersionFn = jest.fn<CoreV1Event[], [string]>();

  beforeEach(() => {
    const devWorkspace = new DevWorkspaceBuilder()
      .withName('test-workspace')
      .withId('workspace-id-123')
      .withUID('uid-123')
      .build();
    workspace = constructWorkspace(devWorkspace);
    startedWorkspaces['uid-123'] = 'resource-version-100';
    jest.clearAllMocks();
  });

  describe('hasPVCErrors', () => {
    it('should return false when workspace is undefined', () => {
      const result = hasPVCErrors(undefined, startedWorkspaces, eventsFromResourceVersionFn);
      expect(result).toBe(false);
    });

    it('should return false when workspace uses ephemeral storage', () => {
      workspace.storageType = 'ephemeral';
      const result = hasPVCErrors(workspace, startedWorkspaces, eventsFromResourceVersionFn);
      expect(result).toBe(false);
    });

    it('should return false when workspace was not started yet', () => {
      const emptyStartedWorkspaces = {};
      const result = hasPVCErrors(workspace, emptyStartedWorkspaces, eventsFromResourceVersionFn);
      expect(result).toBe(false);
    });

    it('should return false when no events are found', () => {
      eventsFromResourceVersionFn.mockReturnValue([]);
      const result = hasPVCErrors(workspace, startedWorkspaces, eventsFromResourceVersionFn);
      expect(result).toBe(false);
      expect(eventsFromResourceVersionFn).toHaveBeenCalledWith('resource-version-100');
    });

    it('should return false when events do not contain PVC errors', () => {
      const events: CoreV1Event[] = [
        {
          metadata: { name: 'workspace-id-123-event-1' },
          reason: 'Started',
          message: 'Container started successfully',
        } as CoreV1Event,
      ];
      eventsFromResourceVersionFn.mockReturnValue(events);
      const result = hasPVCErrors(workspace, startedWorkspaces, eventsFromResourceVersionFn);
      expect(result).toBe(false);
    });

    it('should return true when PVC error with "failed to create subPath directory" is found', () => {
      const events: CoreV1Event[] = [
        {
          metadata: { name: 'workspace-id-123-pod' },
          reason: 'Failed',
          message: 'failed to create subPath directory for volumeMount',
        } as CoreV1Event,
      ];
      eventsFromResourceVersionFn.mockReturnValue(events);
      const result = hasPVCErrors(workspace, startedWorkspaces, eventsFromResourceVersionFn);
      expect(result).toBe(true);
    });

    it('should return true when PVC error with "error for volume" is found', () => {
      const events: CoreV1Event[] = [
        {
          metadata: { name: 'workspace-id-123-pod' },
          reason: 'Failed',
          message: 'error for volume "pvc-claim": disk quota exceeded',
        } as CoreV1Event,
      ];
      eventsFromResourceVersionFn.mockReturnValue(events);
      const result = hasPVCErrors(workspace, startedWorkspaces, eventsFromResourceVersionFn);
      expect(result).toBe(true);
    });

    it('should filter events only for the target workspace', () => {
      const events: CoreV1Event[] = [
        {
          metadata: { name: 'other-workspace-event' },
          reason: 'Failed',
          message: 'failed to create subPath directory for volumeMount',
        } as CoreV1Event,
        {
          metadata: { name: 'workspace-id-123-event' },
          reason: 'Failed',
          message: 'failed to create subPath directory for volumeMount',
        } as CoreV1Event,
      ];
      eventsFromResourceVersionFn.mockReturnValue(events);
      const result = hasPVCErrors(workspace, startedWorkspaces, eventsFromResourceVersionFn);
      expect(result).toBe(true);
    });

    it('should return false when event reason is not Failed', () => {
      const events: CoreV1Event[] = [
        {
          metadata: { name: 'workspace-id-123-event' },
          reason: 'Warning',
          message: 'failed to create subPath directory for volumeMount',
        } as CoreV1Event,
      ];
      eventsFromResourceVersionFn.mockReturnValue(events);
      const result = hasPVCErrors(workspace, startedWorkspaces, eventsFromResourceVersionFn);
      expect(result).toBe(false);
    });

    it('should return false when event does not contain PVC error patterns', () => {
      const events: CoreV1Event[] = [
        {
          metadata: { name: 'workspace-id-123-event' },
          reason: 'Failed',
          message: 'Some other error message',
        } as CoreV1Event,
      ];
      eventsFromResourceVersionFn.mockReturnValue(events);
      const result = hasPVCErrors(workspace, startedWorkspaces, eventsFromResourceVersionFn);
      expect(result).toBe(false);
    });

    describe('restartInitiatedSet', () => {
      it('should return false when restart was initiated for this workspace', () => {
        const events: CoreV1Event[] = [
          {
            metadata: { name: 'workspace-id-123-pod' },
            reason: 'Failed',
            message: 'failed to create subPath directory for volumeMount',
          } as CoreV1Event,
        ];
        eventsFromResourceVersionFn.mockReturnValue(events);

        const restartInitiatedSet = new Set<string>();
        restartInitiatedSet.add('uid-123');

        const result = hasPVCErrors(
          workspace,
          startedWorkspaces,
          eventsFromResourceVersionFn,
          restartInitiatedSet,
        );
        expect(result).toBe(false);
      });

      it('should return true when restart was not initiated for this workspace', () => {
        const events: CoreV1Event[] = [
          {
            metadata: { name: 'workspace-id-123-pod' },
            reason: 'Failed',
            message: 'failed to create subPath directory for volumeMount',
          } as CoreV1Event,
        ];
        eventsFromResourceVersionFn.mockReturnValue(events);

        const restartInitiatedSet = new Set<string>();
        // Set is empty - restart not initiated

        const result = hasPVCErrors(
          workspace,
          startedWorkspaces,
          eventsFromResourceVersionFn,
          restartInitiatedSet,
        );
        expect(result).toBe(true);
      });

      it('should return true when restartInitiatedSet is undefined', () => {
        const events: CoreV1Event[] = [
          {
            metadata: { name: 'workspace-id-123-pod' },
            reason: 'Failed',
            message: 'failed to create subPath directory for volumeMount',
          } as CoreV1Event,
        ];
        eventsFromResourceVersionFn.mockReturnValue(events);

        const result = hasPVCErrors(
          workspace,
          startedWorkspaces,
          eventsFromResourceVersionFn,
          undefined,
        );
        expect(result).toBe(true);
      });
    });
  });
});
