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

import { Workspace } from '@/services/workspace-adapter';

/**
 * Substrings that identify a storage exhaustion failure in a Kubernetes event
 * message. The first two come from the kubelet when it cannot prepare a volume
 * subPath; the third catches mount and container-create failures that report
 * the exhausted device directly, which the first two miss.
 */
const PVC_ERRORS_SUBSTR = [
  'failed to create subPath directory for volumeMount',
  'error for volume',
  'no space left on device',
];

/**
 * Detects whether the workspace failed to start because its persistent volume
 * is full, by scanning the Kubernetes events recorded since the start attempt.
 *
 * @param workspace the workspace being started
 * @param startedWorkspaces maps a workspace UID to the resource version at the moment it was started
 * @param eventsFromResourceVersionFn returns the events at or after the given resource version
 * @returns true when at least one storage exhaustion event belongs to this workspace
 */
export function hasPVCErrors(
  workspace: Workspace | undefined,
  startedWorkspaces: { [key: string]: string },
  eventsFromResourceVersionFn: (resourceVersion: string) => CoreV1Event[],
): boolean {
  // an ephemeral workspace has no PVC, so it cannot run out of PVC space
  if (workspace === undefined || workspace.storageType === 'ephemeral') {
    return false;
  }

  // without the resource version recorded at start, events cannot be
  // attributed to this start attempt
  const resourceVersion = startedWorkspaces[workspace.uid];
  if (resourceVersion === undefined) {
    return false;
  }

  return eventsFromResourceVersionFn(resourceVersion).some(
    (event: CoreV1Event) =>
      event.metadata.name?.startsWith(workspace.id) === true &&
      event.reason === 'Failed' &&
      PVC_ERRORS_SUBSTR.some(str => event.message?.includes(str) === true),
  );
}
