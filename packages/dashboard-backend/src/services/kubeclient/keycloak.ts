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
import https from 'https';

const keycloakAuthPath = '/realms/che/broker/openshift-v4/token';

export async function validateToken(keycloakToken: string): Promise<void> {
  // todo implement to validate token on k8s
  return undefined;
}

/**
 * Transform the keycloak token into an OpenShift token
 * @param keycloakToken
 * @throws Will throw an error if process.env.KEYCLOAK_URL is undefined
 * @returns The openshift token obtained from the keycloak token
 */
export async function keycloakToOpenShiftToken(keycloakToken: string): Promise<string> {
  const keycloak = process.env.KEYCLOAK_URL as string;
  if (!keycloak) {
    throw 'KEYCLOAK_URL environment variable must be set';
  }
  const keycloakEndTrimmed = keycloak.endsWith('/') ? keycloak.substr(-1) : keycloak;
  return axios.get(keycloakEndTrimmed + keycloakAuthPath, {
    headers: {
      'Authorization': `Bearer ${keycloakToken}`
    },
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    })
  }).then(resp => (resp.data['access_token']));
}
