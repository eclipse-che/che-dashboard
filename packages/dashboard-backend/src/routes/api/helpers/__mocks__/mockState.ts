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
 * Mock state a test needs to change between cases.
 *
 * It lives in its own module because Jest keeps manual mocks in a registry of
 * their own: a test that imports `__mocks__/getDevWorkspaceClient` directly
 * gets a second copy of it, so a value exported from there can be read by the
 * test but never written for the route under test to see. A plain module that
 * both of them import is loaded once, and writes to it are shared.
 */
export const mockState = {
  /** Stands in for `spec.agentSandbox.enabled` of the CheCluster CR. */
  agentSandboxEnabled: false,
};
