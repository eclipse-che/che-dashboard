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
import * as k8s from '@kubernetes/client-node';

export const namespace = 'user-che';
export const workspaceName = 'my-workspace';
export const workspaceId = 'workspace1af2f1d9f3b745f6';

export function buildDevWorkspace(
  options: { storageType?: string; phase?: string; workspaceId?: string | null } = {},
): V1alpha2DevWorkspace {
  const attributes =
    options.storageType !== undefined
      ? { 'controller.devfile.io/storage-type': options.storageType }
      : undefined;
  const id = options.workspaceId === null ? undefined : options.workspaceId ?? workspaceId;
  return {
    apiVersion: 'workspace.devfile.io/v1alpha2',
    kind: 'DevWorkspace',
    metadata: { name: workspaceName, namespace },
    spec: { started: options.phase === 'Running', template: { attributes } },
    status: { devworkspaceId: id, phase: options.phase ?? 'Stopped' },
  } as V1alpha2DevWorkspace;
}

export function buildPod(claimName = 'claim-devworkspace'): k8s.V1Pod {
  return {
    metadata: { name: `${workspaceId}-abc`, namespace },
    spec: {
      containers: [
        {
          name: 'che-gateway',
          volumeMounts: [{ name: 'gateway-config', mountPath: '/etc/gateway' }],
        },
        {
          name: 'tools',
          volumeMounts: [
            { name: 'claim-volume', mountPath: '/projects', subPath: `${workspaceId}/projects` },
          ],
        },
      ],
      volumes: [
        { name: 'gateway-config', configMap: { name: 'gateway' } },
        { name: 'other-pvc', persistentVolumeClaim: { claimName: 'unrelated' } },
        { name: 'claim-volume', persistentVolumeClaim: { claimName } },
      ],
    },
  };
}

export function buildPvc(
  options: {
    name?: string;
    requested?: string;
    capacity?: string;
    storageClassName?: string;
    conditions?: string[];
  } = {},
): k8s.V1PersistentVolumeClaim {
  return {
    metadata: { name: options.name ?? 'claim-devworkspace', namespace },
    spec: {
      storageClassName: options.storageClassName ?? 'standard',
      resources: { requests: { storage: options.requested ?? '10Gi' } },
    },
    status: {
      capacity: { storage: options.capacity ?? options.requested ?? '10Gi' },
      conditions: (options.conditions ?? []).map(type => ({ type, status: 'True' })),
    },
  };
}

export function buildApiException(code: number, message: string): k8s.ApiException<unknown> {
  return new k8s.ApiException(code, message, { kind: 'Status', code, message }, {});
}
