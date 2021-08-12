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

let keycloakUserInfoEndpoint: string | undefined;

export async function validateToken(keycloakToken: string): Promise<void> {
  if (!keycloakUserInfoEndpoint) {
    // todo init value
    // 1. request keycloak endpoint from CHE_HOST/api/keycloak/settings
    // 2. cache made response
    //   ...
    //   "che.keycloak.userinfo.endpoint":"https://${SOME_HOST}/auth/realms/codeready/protocol/openid-connect/userinfo",
    //   ...
  }
  // 4. validate token with

  // todo implement to validate token on k8s
  return undefined;
}
