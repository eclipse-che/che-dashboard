/*
 * Copyright (c) 2018-2023 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { api } from '@eclipse-che/common';
import * as k8s from '@kubernetes/client-node';
import { IPersonalAccessTokenApi } from '../../types';
import { createError } from '../helpers/createError';
import { CoreV1API, prepareCoreV1API } from '../helpers/prepareCoreV1API';
import {
  buildLabelSelector,
  DUMMY_TOKEN_DATA,
  isPatSecret,
  PersonalAccessTokenSecret,
  toSecret,
  toSecretName,
  toToken,
} from './helpers';

const API_ERROR_LABEL = 'CORE_V1_API_ERROR';

export class PersonalAccessTokenService implements IPersonalAccessTokenApi {
  private readonly coreV1API: CoreV1API;

  constructor(kc: k8s.KubeConfig) {
    this.coreV1API = prepareCoreV1API(kc);
  }

  async listInNamespace(namespace: string): Promise<Array<api.PersonalAccessToken>> {
    try {
      const labelSelector = buildLabelSelector();
      const resp = await this.coreV1API.listNamespacedSecret(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        labelSelector,
      );
      return resp.body.items
        .filter(secret => isPatSecret(secret))
        .map(secret => {
          return toToken(secret);
        });
    } catch (error) {
      const additionalMessage = `Unable to list personal access tokens in the namespace "${namespace}"`;
      throw createError(error, API_ERROR_LABEL, additionalMessage);
    }
  }

  async create(
    namespace: string,
    personalAccessToken: api.PersonalAccessToken,
  ): Promise<api.PersonalAccessToken> {
    try {
      const secret = toSecret(namespace, personalAccessToken);
      const { body } = await this.coreV1API.createNamespacedSecret(namespace, secret);
      return toToken(body);
    } catch (error) {
      const additionalMessage = `Unable to create personal access token secret "${personalAccessToken.tokenName}"`;
      throw createError(error, API_ERROR_LABEL, additionalMessage);
    }
  }

  async replace(
    namespace: string,
    token: api.PersonalAccessToken,
  ): Promise<api.PersonalAccessToken> {
    const secretName = toSecretName(token.tokenName);

    /* read the existing secret to get the real token value */

    let existingSecret: k8s.V1Secret;
    try {
      const resp = await this.coreV1API.readNamespacedSecret(secretName, namespace);
      existingSecret = resp.body;
    } catch (e) {
      throw new Error(
        `Unable to find personal access token secret "${token.tokenName}" in the namespace "${namespace}"`,
      );
    }

    /* replace the dummy token value with the real one */

    if (token.tokenData === DUMMY_TOKEN_DATA) {
      token.tokenData = existingSecret.data?.token as string;
    }

    /* replace the existing secret with the new one */

    try {
      const { body } = await this.coreV1API.replaceNamespacedSecret(
        secretName,
        namespace,
        toSecret(namespace, token),
      );
      const newSecret = body as PersonalAccessTokenSecret;
      return toToken(newSecret);
    } catch (error) {
      const additionalMessage = `Unable to replace personal access token secret "${token.tokenName}" in the namespace "${namespace}"`;
      throw createError(error, API_ERROR_LABEL, additionalMessage);
    }
  }

  async delete(namespace: string, tokenName: string): Promise<void> {
    const secretName = toSecretName(tokenName);
    try {
      await this.coreV1API.deleteNamespacedSecret(secretName, namespace);
    } catch (error) {
      const additionalMessage = `Unable to delete personal access token secret "${tokenName}" in the namespace "${namespace}"`;
      throw createError(error, API_ERROR_LABEL, additionalMessage);
    }
  }
}
