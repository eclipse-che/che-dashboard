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

export type StorageStrategy = 'per-user' | 'per-workspace' | 'ephemeral';

/** Whether the storage class of the workspace PVC allows volume expansion */
export type Expandability = 'allowed' | 'forbidden' | 'unknown';

export interface WorkspaceStorageInfo {
  strategy: StorageStrategy;
  pvcName?: string;
  /** `true` when the PVC is shared by all workspaces of the namespace (`per-user` strategy) */
  shared: boolean;
  storageClassName?: string;
  /** `spec.resources.requests.storage` of the PVC */
  requested?: string;
  /** `status.capacity.storage` of the PVC */
  capacity?: string;
  expandability: Expandability;
  /** The PVC has the `Resizing` condition */
  resizing: boolean;
  /** The PVC has the `FileSystemResizePending` condition */
  fsResizePending: boolean;
}

export interface WorkspaceStorageUsage {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
}

export type QuotaCheckStatus = 'ok' | 'exceeded' | 'unavailable';

export interface QuotaCheckEntry {
  source: 'ResourceQuota' | 'LimitRange';
  /** Name of the ResourceQuota or LimitRange object */
  name: string;
  /** Constrained key, e.g. `requests.storage` */
  key: string;
  used?: string;
  hard: string;
  projected: string;
  ok: boolean;
}

export interface WorkspaceStorageQuotaCheck {
  status: QuotaCheckStatus;
  entries: QuotaCheckEntry[];
  /** Largest PVC size that fits all constraints */
  maxAllowedSize?: string;
}

export interface WorkspaceStorageResizeRequest {
  size: string;
}
