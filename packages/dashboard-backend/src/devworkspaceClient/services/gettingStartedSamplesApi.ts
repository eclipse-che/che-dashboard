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

import { IGettingStartedSampleApi } from '../types';
import * as k8s from '@kubernetes/client-node';
import { api } from '@eclipse-che/common';
import { CoreV1API, prepareCoreV1API } from './helpers/prepareCoreV1API';
import { createError } from './helpers/createError';

const API_ERROR_LABEL = 'CORE_V1_API_ERROR';
const DEVFILE_METADATA_LABEL_SELECTOR =
  'app.kubernetes.io/component=getting-started-samples,app.kubernetes.io/part-of=che.eclipse.org';
const DEFAULT_ICON = {
  base64data:
    'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZlcnNpb249IjEuMSIgaGVpZ2h0PSI1ZW0iIHdpZHRoPSI1ZW0iIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj4KICA8ZyBmaWxsPSIjNmE2ZTczIj4KICA8cGF0aAogICAgICBkPSJNNDg4LjYgMjUwLjJMMzkyIDIxNFYxMDUuNWMwLTE1LTkuMy0yOC40LTIzLjQtMzMuN2wtMTAwLTM3LjVjLTguMS0zLjEtMTcuMS0zLjEtMjUuMyAwbC0xMDAgMzcuNWMtMTQuMSA1LjMtMjMuNCAxOC43LTIzLjQgMzMuN1YyMTRsLTk2LjYgMzYuMkM5LjMgMjU1LjUgMCAyNjguOSAwIDI4My45VjM5NGMwIDEzLjYgNy43IDI2LjEgMTkuOSAzMi4ybDEwMCA1MGMxMC4xIDUuMSAyMi4xIDUuMSAzMi4yIDBsMTAzLjktNTIgMTAzLjkgNTJjMTAuMSA1LjEgMjIuMSA1LjEgMzIuMiAwbDEwMC01MGMxMi4yLTYuMSAxOS45LTE4LjYgMTkuOS0zMi4yVjI4My45YzAtMTUtOS4zLTI4LjQtMjMuNC0zMy43ek0zNTggMjE0LjhsLTg1IDMxLjl2LTY4LjJsODUtMzd2NzMuM3pNMTU0IDEwNC4xbDEwMi0zOC4yIDEwMiAzOC4ydi42bC0xMDIgNDEuNC0xMDItNDEuNHYtLjZ6bTg0IDI5MS4xbC04NSA0Mi41di03OS4xbDg1LTM4Ljh2NzUuNHptMC0xMTJsLTEwMiA0MS40LTEwMi00MS40di0uNmwxMDItMzguMiAxMDIgMzguMnYuNnptMjQwIDExMmwtODUgNDIuNXYtNzkuMWw4NS0zOC44djc1LjR6bTAtMTEybC0xMDIgNDEuNC0xMDItNDEuNHYtLjZsMTAyLTM4LjIgMTAyIDM4LjJ2LjZ6Ij48L3BhdGg+CiAgPC9nPgo8L3N2Zz4K',
  mediatype: 'image/svg+xml',
};

export class GettingStartedSample implements IGettingStartedSampleApi {
  private readonly coreV1API: CoreV1API;
  constructor(kubeConfig: k8s.KubeConfig) {
    this.coreV1API = prepareCoreV1API(kubeConfig);
  }

  private get env(): { NAMESPACE?: string } {
    return {
      NAMESPACE: process.env.CHECLUSTER_CR_NAMESPACE,
    };
  }

  async list(): Promise<Array<api.IGettingStartedSample>> {
    if (!this.env.NAMESPACE) {
      console.warn('Mandatory environment variables are not defined: $CHECLUSTER_CR_NAMESPACE');
      return [];
    }

    let response;
    try {
      response = await this.coreV1API.listNamespacedConfigMap(
        this.env.NAMESPACE,
        undefined,
        undefined,
        undefined,
        undefined,
        DEVFILE_METADATA_LABEL_SELECTOR,
      );
    } catch (error) {
      const additionalMessage = 'Unable to list getting started samples ConfigMap';
      throw createError(error, API_ERROR_LABEL, additionalMessage);
    }

    const samples = [];

    for (const cm of response.body.items) {
      if (cm.data) {
        for (const key in cm.data) {
          try {
            const sample = JSON.parse(cm.data[key]);
            Array.isArray(sample) ? samples.push(...sample) : samples.push(sample);
          } catch (error) {
            console.error(`Failed to parse getting started samples: ${error}`);
          }
        }
      }
    }

    for (const sample of samples) {
      if (!sample.icon) {
        sample.icon = DEFAULT_ICON;
      }
    }

    return samples;
  }
}
