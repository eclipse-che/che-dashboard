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

import * as k8s from '@kubernetes/client-node';
import { ISecretApi } from '../../types';
import { V1Secret } from '@kubernetes/client-node/dist/gen/model/v1Secret';
import { V1Status } from '@kubernetes/client-node/dist/gen/model/v1Status';
import { api } from '@eclipse-che/common';

export class SecretApi implements ISecretApi {
  private readonly coreV1API: k8s.CoreV1Api;

  constructor(kc: k8s.KubeConfig) {
    this.coreV1API = kc.makeApiClient(k8s.CoreV1Api);
  }

  async create(
    namespace: string,
    body: V1Secret
  ): Promise<V1Secret> {
    const resp = await this.coreV1API.createNamespacedSecret(namespace, body);
    return resp.body as V1Secret;
  }

  async read(
    namespace: string,
    name: string
  ): Promise<V1Secret> {
    const resp = await this.coreV1API.readNamespacedSecret(
      name,
      namespace,
    );
    return resp.body;
  }

  async readAll(
    namespace: string,
  ): Promise<Array<V1Secret>> {
    const resp = await this.coreV1API.listNamespacedSecret(namespace);
    return resp?.body?.items || [];
  }

  async replace(
    namespace: string,
    name: string,
    body: V1Secret
  ): Promise<V1Secret> {
    const resp = await this.coreV1API.replaceNamespacedSecret(
      name,
      namespace,
      body);
    return resp.body;
  }

  async patch(
    namespace: string,
    name: string,
    body: api.IPatch[]
  ): Promise<V1Secret> {
    const options = {
      headers: {
        'Content-type': k8s.PatchUtils.PATCH_FORMAT_JSON_PATCH,
      },
    };
    const resp = await this.coreV1API.patchNamespacedSecret(
      name,
      namespace,
      body,
      undefined,
      undefined,
      undefined,
      undefined,
      options
    );
    return resp.body;
  }

  async delete(
    namespace: string,
    name: string
  ): Promise<V1Status> {
    const resp = await this.coreV1API.deleteNamespacedSecret(
      name,
      namespace,
    );
    return resp.body;
  }

}
