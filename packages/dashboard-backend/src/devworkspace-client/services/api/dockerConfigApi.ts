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
import { IDockerConfigApi } from '../../types';
import { V1Secret } from '@kubernetes/client-node/dist/gen/model/v1Secret';
import { api } from '@eclipse-che/common';
import { createError } from '../helpers';

const secretKey = '.dockerconfigjson';
const secretName = 'devworkspace-container-registry-dockercfg';
const secretLabels = { 'controller.devfile.io/devworkspace_pullsecret': 'true' };

export class DockerConfigApi implements IDockerConfigApi {

  private readonly coreV1API: k8s.CoreV1Api;

  constructor(kc: k8s.KubeConfig) {
    this.coreV1API = kc.makeApiClient(k8s.CoreV1Api);
  }

  async read(namespace: string): Promise<api.IDockerConfig> {
    try {
      const { body } = await this.coreV1API.readNamespacedSecret(secretName, namespace);
      return this.toDockerConfig(body);
    } catch (error) {
      if ((error as { statusCode?: number } | undefined)?.statusCode === 404) {
        return this.toDockerConfig();
      }
      const additionalMessage = `unable to read dockerConfig in the specified namespace "${namespace}"`;
      throw createError(error, 'CORE_V1_API_ERROR', additionalMessage);
    }
  }

  async update(namespace: string, dockerCfg: api.IDockerConfig): Promise<api.IDockerConfig> {
    try {
      let secret: V1Secret | undefined;
      try {
        const resp = await this.coreV1API.readNamespacedSecret(secretName, namespace);
        secret = resp.body;
      } catch (e) {
        if ((e as { statusCode?: number } | undefined)?.statusCode === 404) {
          const dockerConfigSecret = this.toDockerConfigSecret(dockerCfg);
          const { body } = await this.coreV1API.createNamespacedSecret(namespace, dockerConfigSecret);
          return this.toDockerConfig(body);
        }
        throw e;
      }
      this.updateDockerConfigSecret(secret, dockerCfg);
      const { body } = await this.coreV1API.replaceNamespacedSecret(secretName, namespace, secret);
      return this.toDockerConfig(body);
    } catch (error) {
      const additionalMessage = `unable to update dockerConfig in the specified namespace "${namespace}"`;
      throw createError(error, 'CORE_V1_API_ERROR', additionalMessage);
    }
  }

  private toDockerConfigSecret(dockerCfg: api.IDockerConfig): V1Secret {
    return {
      apiVersion: 'v1',
      data: {
        [secretKey]: dockerCfg.dockerconfig
      },
      kind: 'Secret',
      metadata: {
        name: secretName,
        labels: secretLabels,
      },
      type: 'kubernetes.io/dockerconfigjson'
    };
  }

  private getDockerConfig(secret?: V1Secret): string {
    return secret?.data?.[secretKey] || '';
  }

  private toDockerConfig(secret?: V1Secret): api.IDockerConfig {
    const dockerconfig = this.getDockerConfig(secret);
    const resourceVersion = secret?.metadata?.resourceVersion;

    return { dockerconfig, resourceVersion };
  }

  private updateDockerConfigSecret(secret: V1Secret, dockerCfg: api.IDockerConfig): void {
    if (!secret.metadata) {
      secret.metadata = {};
    }
    secret.data = { [secretKey]: dockerCfg.dockerconfig };
    secret.metadata.labels = secretLabels;
    if (dockerCfg.resourceVersion) {
      secret.metadata.resourceVersion = dockerCfg.resourceVersion;
    }
  }
}
