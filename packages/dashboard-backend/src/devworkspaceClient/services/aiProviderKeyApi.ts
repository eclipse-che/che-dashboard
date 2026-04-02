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

import { createError } from '@/devworkspaceClient/services/helpers/createError';
import {
  CoreV1API,
  prepareCoreV1API,
} from '@/devworkspaceClient/services/helpers/prepareCoreV1API';
import { IAiProviderKeyApi } from '@/devworkspaceClient/types';

const API_ERROR_LABEL = 'CORE_V1_API_ERROR';

const AI_PROVIDER_ID_LABEL = 'che.eclipse.org/ai-provider-id';
const MOUNT_TO_DEVWORKSPACE_LABEL = 'controller.devfile.io/mount-to-devworkspace';
const WATCH_SECRET_LABEL = 'controller.devfile.io/watch-secret';
const MOUNT_AS_ANNOTATION = 'controller.devfile.io/mount-as';

function toSecretName(envVarName: string): string {
  return 'ai-provider-' + envVarName.toLowerCase().replace(/_/g, '-');
}

function toSanitizedProviderId(providerId: string): string {
  return providerId.replace(/\//g, '-');
}

function buildSecretLabels(providerId: string): Record<string, string> {
  return {
    [MOUNT_TO_DEVWORKSPACE_LABEL]: 'true',
    [WATCH_SECRET_LABEL]: 'true',
    [AI_PROVIDER_ID_LABEL]: toSanitizedProviderId(providerId),
  };
}

export class AiProviderKeyApiService implements IAiProviderKeyApi {
  private readonly coreV1API: CoreV1API;

  constructor(kc: k8s.KubeConfig) {
    this.coreV1API = prepareCoreV1API(kc);
  }

  async listProviderIdsWithKey(namespace: string): Promise<string[]> {
    try {
      const resp = await this.coreV1API.listNamespacedSecret({
        namespace,
        labelSelector: AI_PROVIDER_ID_LABEL,
      });
      return resp.items
        .map(secret => secret.metadata?.labels?.[AI_PROVIDER_ID_LABEL])
        .filter((id): id is string => id !== undefined);
    } catch (error) {
      const additionalMessage = `Unable to list AI provider keys in the namespace "${namespace}"`;
      throw createError(error, API_ERROR_LABEL, additionalMessage);
    }
  }

  async createOrReplace(
    namespace: string,
    providerId: string,
    apiKey: string,
    envVarName: string,
  ): Promise<void> {
    const secretName = toSecretName(envVarName);
    const labels = buildSecretLabels(providerId);

    const secretBody: k8s.V1Secret = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: secretName,
        namespace,
        labels,
        annotations: {
          [MOUNT_AS_ANNOTATION]: 'env',
        },
      },
      type: 'Opaque',
      data: {
        [envVarName]: apiKey,
      },
    };

    // Create-first approach: avoids TOCTOU race when two concurrent requests
    // both observe "secret does not exist" and both try to create.
    try {
      await this.coreV1API.createNamespacedSecret({
        namespace,
        body: secretBody,
      });
    } catch (createError_) {
      // 409 Conflict means the secret already exists — fall back to replace.
      if (helpers.errors.isKubeClientError(createError_) && createError_.code === 409) {
        try {
          await this.coreV1API.replaceNamespacedSecret({
            name: secretName,
            namespace,
            body: secretBody,
          });
        } catch (replaceError) {
          const additionalMessage = `Unable to replace AI provider key for "${providerId}" in the namespace "${namespace}"`;
          throw createError(replaceError, API_ERROR_LABEL, additionalMessage);
        }
      } else {
        const additionalMessage = `Unable to create AI provider key for "${providerId}" in the namespace "${namespace}"`;
        throw createError(createError_, API_ERROR_LABEL, additionalMessage);
      }
    }
  }

  async delete(namespace: string, providerId: string): Promise<void> {
    const sanitizedId = toSanitizedProviderId(providerId);
    try {
      const resp = await this.coreV1API.listNamespacedSecret({
        namespace,
        labelSelector: `${AI_PROVIDER_ID_LABEL}=${sanitizedId}`,
      });
      const secretName = resp.items[0]?.metadata?.name;
      if (secretName) {
        await this.coreV1API.deleteNamespacedSecret({ name: secretName, namespace });
      }
    } catch (error) {
      const additionalMessage = `Unable to delete AI provider key for "${providerId}" in the namespace "${namespace}"`;
      throw createError(error, API_ERROR_LABEL, additionalMessage);
    }
  }
}
