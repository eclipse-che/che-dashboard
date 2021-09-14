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
import { getMessage } from '@eclipse-che/common/lib/helpers/errors';
import { createFastifyError } from '../helpers';
import { isLocalRun } from '../../local-run';
import * as https from 'https';
import { URL } from 'url';

const CHE_HOST = process.env.CHE_HOST as string;
const ENDPOINT = 'che.keycloak.userinfo.endpoint';

let keycloakEndpointUrl: URL | undefined;

const httpsAgent = new https.Agent({
  // todo: remove this temporary solution after solving https://github.com/eclipse/che/issues/20367
  rejectUnauthorized: false
});

export async function validateToken(keycloakToken: string): Promise<void> {
  // lazy initialization
  if (!keycloakEndpointUrl) {
    keycloakEndpointUrl = await evaluateKeycloakEndpointUrl();
  }

  const headers = { Authorization: `Bearer ${keycloakToken}` };
  try {
    await axios.get(keycloakEndpointUrl.href, { headers, httpsAgent });
    // token is a valid
  } catch (e) {
    throw createFastifyError(
      'FST_UNAUTHORIZED',
      `Failed to validate token: ${getMessage(e)}`,
      401
    );
  }
}

async function evaluateKeycloakEndpointUrl(): Promise<URL> {
  try {
    const keycloakSettingsUrl = new URL('/api/keycloak/settings', CHE_HOST);
    const response = await axios.get(keycloakSettingsUrl.href, { httpsAgent });
    const keycloakEndpoint = response.data[ENDPOINT];
    // we should change a HOST in the case of using proxy to prevent the host check error
    if (isLocalRun()) {
      const { pathname } = new URL(keycloakEndpoint);
      return new URL(pathname, CHE_HOST);
    } else {
      return new URL(keycloakEndpoint);
    }
  } catch (e) {
    throw createFastifyError(
      'FST_UNAUTHORIZED',
      `Failed to fetch keycloak settings: ${getMessage(e)}`,
      401
    );
  }
}
