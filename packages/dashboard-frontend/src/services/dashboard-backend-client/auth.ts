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

import { KeycloakAuthService } from '../keycloak/auth';
import { container } from '../../inversify.config';

let keycloakAuthService: KeycloakAuthService;
let shouldUpdateToken = true;

async function  getToken(): Promise<string|undefined> {
  if (KeycloakAuthService.sso) {
    // lazy init
    if (!keycloakAuthService) {
      keycloakAuthService = container.get(KeycloakAuthService);
    }
  } else {
    return undefined;
  }
  if (shouldUpdateToken && keycloakAuthService) {
    await keycloakAuthService.forceUpdateToken();
    shouldUpdateToken = false;
    window.setTimeout(() => shouldUpdateToken = true, 60000);
  }
  return KeycloakAuthService?.keycloak?.token;
}

export async function addAuthentication(headers: { [key: string]: string }) {
  const token = await getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`; // Bearer Token Authentication
  }
  return headers;
}
