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
import { StorageStrategy } from '@eclipse-che/common';
import * as k8s from '@kubernetes/client-node';

export const STORAGE_TYPE_ATTR = 'controller.devfile.io/storage-type';
export const DEVWORKSPACE_ID_LABEL = 'controller.devfile.io/devworkspace_id';
export const COMMON_PVC_NAME = 'claim-devworkspace';
export const PROJECTS_MOUNT_PATH = '/projects';
export const DEFAULT_STORAGE_STRATEGY: StorageStrategy = 'per-user';

export type PvcResolution = {
  strategy: StorageStrategy;
  pvcName?: string;
  shared: boolean;
};

/**
 * Maps a DevWorkspace Operator storage type to the strategy shown in the Dashboard.
 * `common` is the DWO name of `per-user`; `async` stores data on the common PVC as well.
 */
export function toStorageStrategy(storageType: unknown): StorageStrategy | undefined {
  switch (storageType) {
    case 'per-user':
    case 'common':
    case 'async':
      return 'per-user';
    case 'per-workspace':
      return 'per-workspace';
    case 'ephemeral':
      return 'ephemeral';
    default:
      return undefined;
  }
}

/**
 * The DevWorkspace attribute wins over the CheCluster default strategy.
 */
export function getStorageStrategy(
  devWorkspace: V1alpha2DevWorkspace,
  defaultStrategy?: string,
): StorageStrategy {
  const attributes = devWorkspace.spec?.template?.attributes as Record<string, unknown> | undefined;
  return (
    toStorageStrategy(attributes?.[STORAGE_TYPE_ATTR]) ||
    toStorageStrategy(defaultStrategy) ||
    DEFAULT_STORAGE_STRATEGY
  );
}

export function getDevWorkspaceId(devWorkspace: V1alpha2DevWorkspace): string | undefined {
  return devWorkspace.status?.devworkspaceId;
}

export function isDevWorkspaceRunning(devWorkspace: V1alpha2DevWorkspace): boolean {
  return devWorkspace.status?.phase === 'Running';
}

/**
 * Returns the first container mounting the projects folder.
 */
export function findProjectsContainer(pod: k8s.V1Pod): k8s.V1Container | undefined {
  return pod.spec?.containers?.find(container =>
    container.volumeMounts?.some(mount => mount.mountPath === PROJECTS_MOUNT_PATH),
  );
}

/**
 * Returns the name of the PVC backing the projects folder of the pod.
 */
export function getPodClaimName(pod: k8s.V1Pod): string | undefined {
  const container = findProjectsContainer(pod);
  const mount = container?.volumeMounts?.find(m => m.mountPath === PROJECTS_MOUNT_PATH);
  if (!mount) {
    return undefined;
  }
  const volume = pod.spec?.volumes?.find(v => v.name === mount.name);
  return volume?.persistentVolumeClaim?.claimName;
}

/**
 * Resolves the PVC of a workspace. The claim name found in the running pod is preferred,
 * the DevWorkspace Operator naming convention is used when the workspace is stopped.
 */
export function resolveWorkspacePvc(
  devWorkspace: V1alpha2DevWorkspace,
  pod: k8s.V1Pod | undefined,
  defaultStrategy?: string,
): PvcResolution {
  const strategy = getStorageStrategy(devWorkspace, defaultStrategy);
  if (strategy === 'ephemeral') {
    return { strategy, shared: false };
  }

  const shared = strategy === 'per-user';
  const podClaimName = pod ? getPodClaimName(pod) : undefined;
  if (podClaimName) {
    return { strategy, pvcName: podClaimName, shared };
  }

  if (shared) {
    return { strategy, pvcName: COMMON_PVC_NAME, shared };
  }
  const workspaceId = getDevWorkspaceId(devWorkspace);
  return { strategy, pvcName: workspaceId ? `storage-${workspaceId}` : undefined, shared };
}
