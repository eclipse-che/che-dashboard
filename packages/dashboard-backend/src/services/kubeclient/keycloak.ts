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
import { isCheServerApiProxyRequired } from '../../index';
import * as https from 'https';

const CHE_HOST = process.env.CHE_HOST as string;
const ENDPOINT = 'che.keycloak.userinfo.endpoint';

let keycloakEndpointUrl: URL | undefined;

const httpsAgent = new https.Agent({
  // TODO: remove this temporary solution after solving  https://github.com/eclipse/che/issues/20367
  rejectUnauthorized: false
});

export async function validateToken(keycloakToken: string): Promise<void> {

  // lazy initialization
  if (!keycloakEndpointUrl) {
    try {
      const keycloakSettingsUrl = new URL('/api/keycloak/settings', CHE_HOST);
      const response = await axios.get(keycloakSettingsUrl.href, { httpsAgent });
      const keycloakEndpoint = response.data[ENDPOINT];
      // we should change a HOST in the case of using proxy to prevent the host check error
      if (isCheServerApiProxyRequired()) {
        const { pathname } = new URL(keycloakEndpoint);
        keycloakEndpointUrl = new URL(pathname, CHE_HOST);
      } else {
        keycloakEndpointUrl = new URL(keycloakEndpoint)
      }
    } catch (e) {
      throw `Failed to fetch keycloak settings: ${getErrorMessage(e)}`;
    }
  }

  const headers = { Authorization: `Bearer ${keycloakToken}` };
  try {
    await axios.get(keycloakEndpointUrl.href, { headers, httpsAgent });
  } catch (e) {
    throw `Failed to to validate token: ${getErrorMessage(e)}`;
  }
}
