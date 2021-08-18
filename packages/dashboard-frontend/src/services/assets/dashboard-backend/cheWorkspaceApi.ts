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
import { getErrorMessage } from '../../helpers/getErrorMessage';
import { KeycloakAuthService } from '../../keycloak/auth';
import { prefix } from './const';

function addAuthentication(headers: { [key: string]: string }) {
  const token = KeycloakAuthService?.keycloak?.token;
  if (token) {
    headers.authentication = token;
  }
  return headers;
}

export async function initializeNamespace(namespace: string): Promise<void> {
  const headers = addAuthentication({});
  const url = `${prefix}/namespace/${namespace}/init`;
  try {
    const response = await axios.get(url, { headers });
    return response.data;
  } catch (e) {
    throw `Failed to initialize namespace '${namespace}'. ${getErrorMessage(e)}`;
  }
}
