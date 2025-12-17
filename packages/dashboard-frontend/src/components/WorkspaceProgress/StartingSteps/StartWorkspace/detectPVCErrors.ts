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

const PVC_ERRORS_SUBSTR = [
  'failed to create subPath directory for volumeMount',
  'error for volume',
];

/**
 * Detects if workspace has PVC-related errors by analyzing Kubernetes events.
 *
 * @param workspace The workspace to check for PVC errors
 * @param startedWorkspaces Map of workspace UIDs to resource versions when they were started
 * @param eventsFromResourceVersionFn Function to retrieve events since a given resource version
 * @param restartInitiatedSet Optional set of workspace UIDs with pending restart (skip detection if present)
 * @returns true if PVC errors are detected, false otherwise
 */
export function hasPVCErrors(
  workspace: Workspace | undefined,
  startedWorkspaces: { [key: string]: string },
  eventsFromResourceVersionFn: (resourceVersion: string) => CoreV1Event[],
  restartInitiatedSet?: Set<string>,
): boolean {
  // no PVC to check
  if (workspace === undefined || workspace.storageType === 'ephemeral') {
    return false;
  }

  // skip PVC error detection if restart was initiated for this workspace
  if (restartInitiatedSet?.has(workspace.uid)) {
    return false;
  }

  // get the resource version when the workspace was started
  const resourceVersion = startedWorkspaces[workspace.uid];
  if (resourceVersion === undefined) {
    return false;
  }

  // get events since the workspace was started
  const events = eventsFromResourceVersionFn(resourceVersion);

  // filter events for the target workspace
  const eventsForWorkspace = events.filter((event: CoreV1Event) =>
    event.metadata.name?.startsWith(workspace.id),
  );

  const PVCErrorEvents = eventsForWorkspace.filter(
    (event: CoreV1Event) =>
      event.reason === 'Failed' &&
      PVC_ERRORS_SUBSTR.find(str => event.message?.includes(str)) !== undefined,
  );

  return PVCErrorEvents.length > 0;
}
