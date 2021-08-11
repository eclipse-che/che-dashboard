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

export async function validateToken(keycloakToken: string): Promise<void> {
  // todo implement to validate token on k8s
  return undefined;
}

export function isKeycloakConfigure(): boolean {
  const keycloak = process.env.KEYCLOAK_URL as string;
  if (!keycloak) {
    throw 'KEYCLOAK_URL environment variable must be set';
  }
  return true;
}
