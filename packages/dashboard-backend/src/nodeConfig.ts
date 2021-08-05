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

/**
 * Process the initialization of the server.
 * If CHE_HOST, KEYCLOAK_URL, KUBERNETES_SERVICE_HOST or KUBERNETES_SERVICE_PORT are undefined then exit the process since we cannot continue
 */
export function initialize(): void {
  // Check that CHE_HOST is defined
  if (!("CHE_HOST" in process.env)) {
    console.error("CHE_HOST environment variable is required");
    process.exit(1);
  }

  // todo it's going to break Single user
  // Check that KEYCLOAK_URL is defined
  if (!("KEYCLOAK_URL" in process.env)) {
    console.error("KEYCLOAK_URL environment variable is required");
    process.exit(1);
  }
}
