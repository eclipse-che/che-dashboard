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
 * Returns true if server has SCC configured but workspace has different or missing SCC.
 */
export function hasSccMismatch(
  containerScc: string | undefined,
  currentScc: string | undefined,
): boolean {
  // If server has no SCC requirement, no mismatch
  if (currentScc === undefined) {
    return false;
  }
  // Server has SCC requirement - check if workspace matches
  return containerScc !== currentScc;
}
