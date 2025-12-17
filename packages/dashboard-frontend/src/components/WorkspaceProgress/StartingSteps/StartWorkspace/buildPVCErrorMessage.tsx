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

import { ApplicationId, ApplicationInfo } from '@eclipse-che/common';
import React from 'react';

import { Workspace } from '@/services/workspace-adapter';

/**
 * Builds an enhanced error message for PVC full errors with actionable guidance.
 *
 * @param workspace The workspace that failed to start
 * @param applications Cluster applications (for OpenShift console link)
 * @returns React node with formatted error message and guidance
 */
export function buildPVCErrorMessage(
  workspace: Workspace | undefined,
  applications: ApplicationInfo[],
): React.ReactNode {
  if (!workspace) {
    return 'PVC is full, workspace will fail to start.';
  }

  const clusterConsole = applications.find(app => app.id === ApplicationId.CLUSTER_CONSOLE);
  const namespace = workspace.namespace;
  // Per-user storage: all workspaces share one PVC, so deleting old workspaces frees space
  // Per-workspace storage: each workspace has its own PVC, so deleting others won't help
  const isPerUserStorage = workspace.storageType === 'per-user';

  let pvcLink: React.ReactNode = null;
  if (clusterConsole) {
    const pvcUrl = `${clusterConsole.url}/k8s/ns/${namespace}/core~v1~PersistentVolumeClaim`;
    pvcLink = (
      <>
        View PVCs in{' '}
        <a href={pvcUrl} target="_blank" rel="noopener noreferrer">
          OpenShift Console
        </a>
        .
      </>
    );
  }

  return (
    <div>
      <p>PVC is full, workspace &quot;{workspace.name}&quot; will fail to start.</p>
      {pvcLink && <p style={{ margin: '0 0 10px 0' }}>{pvcLink}</p>}
      <p style={{ margin: '5px 0 0 0' }}>
        <strong>Ways to fix this issue:</strong>
      </p>
      {isPerUserStorage && (
        <p>
          - Delete old or unused workspaces to free up PVC storage space. This will automatically
          clean up associated PVC resources and free storage.
        </p>
      )}
      <p>- Manually expand PVC size by updating the YAML:</p>
      <pre style={{ backgroundColor: 'rgb(246, 248, 250, 0.6)', padding: '5px 0' }}>
        {`spec:\n  resources:\n    requests:\n      storage: ①`}
      </pre>
      <p style={{ margin: '5px 0 0 0' }}>① - expand PVC size e.g., 10Gi, 20Gi</p>
      <p style={{ margin: '10px 0 0 0' }}>Restart the workspace once PVC definition is updated.</p>
    </div>
  );
}
