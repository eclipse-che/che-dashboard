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
      <p>
        <strong>PVC is full, workspace &quot;{workspace.name}&quot; will fail to start.</strong>
      </p>
      {pvcLink && <p>{pvcLink}</p>}
      <p>
        <strong>To fix this issue:</strong>
      </p>
      <ol>
        <li>
          Delete old or unused workspaces to free up PVC storage space. This will automatically
          clean up associated PVC resources and free storage.
        </li>
        <li>
          Manually expand PVC size by updating the YAML:
          <pre>
            {`resources:
  requests:
    storage: <new-size>  # e.g., 10Gi, 20Gi`}
          </pre>
        </li>
        <li>Restart the workspace once PVC definition is updated</li>
      </ol>
    </div>
  );
}
