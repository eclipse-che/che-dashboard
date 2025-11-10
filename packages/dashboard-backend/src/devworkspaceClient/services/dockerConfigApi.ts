/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { helpers } from '@eclipse-che/common';
import * as k8s from '@kubernetes/client-node';
import { V1Secret } from '@kubernetes/client-node/dist/gen/model/v1Secret';

import { createError } from '@/devworkspaceClient/services/helpers/createError';
import {
  CoreV1API,
  prepareCoreV1API,
} from '@/devworkspaceClient/services/helpers/prepareCoreV1API';
import { IDockerConfigApi } from '@/devworkspaceClient/types';

export const SECRET_KEY = '.dockerconfigjson';
export const SECRET_NAME = 'devworkspace-container-registry-dockercfg';
const SECRET_LABELS = {
  'controller.devfile.io/devworkspace_pullsecret': 'true',
  'controller.devfile.io/watch-secret': 'true',
};
const DOCKER_CONFIG_API_ERROR_LABEL = 'CORE_V1_API_ERROR';
const EMPTY_DOCKERCONFIG = 'eyJhdXRocyI6IFtdfQ=='; // base64 for '{"auths": []}'

export class DockerConfigApiService implements IDockerConfigApi {
  private readonly coreV1API: CoreV1API;

  constructor(kc: k8s.KubeConfig) {
    this.coreV1API = prepareCoreV1API(kc);
  }

  async read(namespace: string): Promise<string> {
    try {
      const { body } = await this.coreV1API.readNamespacedSecret(SECRET_NAME, namespace);
      return this.getDockerConfig(body);
    } catch (error) {
      if (helpers.errors.isKubeClientError(error) && error.statusCode === 404) {
        return EMPTY_DOCKERCONFIG;
      }
      const additionalMessage = `Unable to read dockerConfig in the specified namespace "${namespace}"`;
      throw createError(error, DOCKER_CONFIG_API_ERROR_LABEL, additionalMessage);
    }
  }

  async update(namespace: string, dockerCfg: string): Promise<string> {
    try {
      const secret = this.toDockerConfigSecret(dockerCfg);
      const { body } = await this.coreV1API.replaceNamespacedSecret(SECRET_NAME, namespace, secret);
      return this.getDockerConfig(body);
    } catch (error) {
      if (helpers.errors.isKubeClientError(error) && error.statusCode === 404) {
        return this.createNamespacedSecret(namespace);
      }
      const additionalMessage = `Unable to update dockerConfig in the specified namespace "${namespace}"`;
      throw createError(error, DOCKER_CONFIG_API_ERROR_LABEL, additionalMessage);
    }
  }

  private async createNamespacedSecret(namespace: string, dockerCfg?: string): Promise<string> {
    const dockerConfigSecret = this.toDockerConfigSecret(dockerCfg);
    try {
      const { body } = await this.coreV1API.createNamespacedSecret(namespace, dockerConfigSecret);
      return this.getDockerConfig(body);
    } catch (error) {
      const additionalMessage = `Unable to create dockerConfig in the specified namespace "${namespace}"`;
      throw createError(error, DOCKER_CONFIG_API_ERROR_LABEL, additionalMessage);
    }
  }

  private toDockerConfigSecret(dockerCfg: string = EMPTY_DOCKERCONFIG): V1Secret {
    return {
      apiVersion: 'v1',
      data: {
        [SECRET_KEY]: dockerCfg,
      },
      kind: 'Secret',
      metadata: {
        name: SECRET_NAME,
        labels: SECRET_LABELS,
      },
      type: 'kubernetes.io/dockerconfigjson',
    };
  }

  private getDockerConfig(secret: V1Secret): string {
    return secret.data?.[SECRET_KEY] || EMPTY_DOCKERCONFIG;
  }
}
