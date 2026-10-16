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

import { V1alpha2DevWorkspace } from '@devfile/api';
import {
  helpers,
  WorkspaceStorageInfo,
  WorkspaceStorageQuotaCheck,
  WorkspaceStorageUsage,
} from '@eclipse-che/common';
import * as k8s from '@kubernetes/client-node';

import { DevWorkspaceApiService } from '@/devworkspaceClient/services/devWorkspaceApi';
import { StorageApiError } from '@/devworkspaceClient/services/storageApi/errors';
import {
  DEVWORKSPACE_ID_LABEL,
  getDevWorkspaceId,
  PvcResolution,
  resolveWorkspacePvc,
} from '@/devworkspaceClient/services/storageApi/pvcResolver';
import { PvcService } from '@/devworkspaceClient/services/storageApi/pvcService';
import { QuotaService } from '@/devworkspaceClient/services/storageApi/quotaService';
import { StorageClassService } from '@/devworkspaceClient/services/storageApi/storageClassService';
import { StorageUsageService } from '@/devworkspaceClient/services/storageApi/storageUsageService';
import { logger } from '@/utils/logger';

type WorkspaceContext = {
  devWorkspace: V1alpha2DevWorkspace;
  pod: k8s.V1Pod | undefined;
  resolution: PvcResolution;
};

/**
 * Workspace storage (PVC) status, usage, quota check and resize.
 * The user token is used for everything except reading storage classes,
 * which falls back to the dashboard service account.
 */
export class WorkspaceStorageApiService {
  private readonly coreV1Api: Pick<k8s.CoreV1Api, 'listNamespacedPod'>;
  private readonly devWorkspaceApi: DevWorkspaceApiService;
  private readonly pvcService: PvcService;
  private readonly quotaService: QuotaService;
  private readonly usageService: StorageUsageService;

  constructor(userKc: k8s.KubeConfig, serviceAccountKc?: k8s.KubeConfig) {
    this.coreV1Api = userKc.makeApiClient(k8s.CoreV1Api);
    this.devWorkspaceApi = new DevWorkspaceApiService(userKc);
    this.pvcService = new PvcService(userKc, new StorageClassService(userKc, serviceAccountKc));
    this.quotaService = new QuotaService(userKc);
    this.usageService = new StorageUsageService(userKc);
  }

  async getInfo(
    namespace: string,
    workspaceName: string,
    defaultStrategy?: string,
  ): Promise<WorkspaceStorageInfo> {
    const { resolution } = await this.getContext(namespace, workspaceName, defaultStrategy);
    return this.pvcService.getInfo(namespace, resolution);
  }

  async getUsage(namespace: string, workspaceName: string): Promise<WorkspaceStorageUsage> {
    const { devWorkspace, pod } = await this.getContext(namespace, workspaceName);
    return this.usageService.getUsage(devWorkspace, pod);
  }

  async checkQuota(
    namespace: string,
    workspaceName: string,
    size: string,
    defaultStrategy?: string,
  ): Promise<WorkspaceStorageQuotaCheck> {
    assertValidSize(size);
    const { resolution } = await this.getContext(namespace, workspaceName, defaultStrategy);
    if (!resolution.pvcName) {
      throw new StorageApiError('This workspace has no persistent volume', 400);
    }
    const pvc = await this.pvcService.readPvc(namespace, resolution.pvcName);
    return this.quotaService.check(namespace, pvc, size);
  }

  async resize(
    namespace: string,
    workspaceName: string,
    size: string,
    defaultStrategy?: string,
  ): Promise<WorkspaceStorageInfo> {
    const { resolution } = await this.getContext(namespace, workspaceName, defaultStrategy);
    return this.pvcService.resize(namespace, resolution, size);
  }

  private async getContext(
    namespace: string,
    workspaceName: string,
    defaultStrategy?: string,
  ): Promise<WorkspaceContext> {
    const devWorkspace = await this.devWorkspaceApi.getByName(namespace, workspaceName);
    const pod = await this.findPod(namespace, devWorkspace);
    const resolution = resolveWorkspacePvc(devWorkspace, pod, defaultStrategy);
    return { devWorkspace, pod, resolution };
  }

  private async findPod(
    namespace: string,
    devWorkspace: V1alpha2DevWorkspace,
  ): Promise<k8s.V1Pod | undefined> {
    const workspaceId = getDevWorkspaceId(devWorkspace);
    if (!workspaceId) {
      return undefined;
    }
    try {
      const { items } = await this.coreV1Api.listNamespacedPod({
        namespace,
        labelSelector: `${DEVWORKSPACE_ID_LABEL}=${workspaceId}`,
      });
      return items.find(pod => !pod.metadata?.deletionTimestamp) ?? items[0];
    } catch (e) {
      // the naming convention is used as a fallback
      logger.warn(e, `Unable to list the pods of workspace "${workspaceId}"`);
      return undefined;
    }
  }
}

function assertValidSize(size: string): void {
  if (!helpers.quantity.isValidQuantity(size)) {
    throw new StorageApiError(`Invalid storage size "${size}"`, 400);
  }
}
