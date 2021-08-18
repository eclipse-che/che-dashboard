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

import axios from 'axios';
import { getErrorMessage } from '../helpers';

const ENDPOINT = 'che.keycloak.userinfo.endpoint';
const HOST = process.env.CHE_HOST as string;

let keycloakUserInfoEndpoint: URL | undefined;

export async function validateToken(keycloakToken: string): Promise<void> {

  // lazy initialization
  if (!keycloakUserInfoEndpoint) {
    try {
      const keycloakSettingsUrl = new URL('/api/keycloak/settings', HOST);
      const response = await axios.get(keycloakSettingsUrl.href);
      const { pathname } = new URL(response.data[ENDPOINT]);
      keycloakUserInfoEndpoint = new URL(pathname, HOST);
    } catch (e) {
      throw `Failed to fetch keycloak settings: ${getErrorMessage(e)}`;
    }
  }

  const headers = { Authorization: `Bearer ${keycloakToken}` };
  try {
    await axios.get(keycloakUserInfoEndpoint.href, { headers });
  } catch (e) {
    throw `Failed to to validate token: ${getErrorMessage(e)}`;
  }
}
