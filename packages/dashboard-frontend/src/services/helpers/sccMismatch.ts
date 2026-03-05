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

/**
 * Warning message displayed when there's a mismatch between the workspace's
 * container SCC (Security Context Constraint) and the current server configuration.
 * This indicates the workspace was created with a different SCC than what is
 * currently configured on the server.
 */
export const SCC_MISMATCH_WARNING_MESSAGE =
  'The workspace was created with a different container SCC (Security Context Constraint) than what is currently configured. The workspace may fail to start.';

/**
 * Check if there's an SCC mismatch between the workspace and server configuration.
 * Returns false when containerScc is undefined (allowing workspaces created before SCC
 * attribute was added to start normally).
 * Returns true if server has SCC configured and workspace has a different SCC value.
 */
export function hasSccMismatch(
  containerScc: string | undefined,
  currentScc: string | undefined,
): boolean {
  // If server has no SCC requirement, no mismatch
  if (currentScc === undefined) {
    return false;
  }
  // If workspace has no SCC (created before this was added), allow start - no mismatch
  if (containerScc === undefined) {
    return false;
  }
  // Server has SCC requirement and workspace has SCC - check if they match
  return containerScc !== currentScc;
}
