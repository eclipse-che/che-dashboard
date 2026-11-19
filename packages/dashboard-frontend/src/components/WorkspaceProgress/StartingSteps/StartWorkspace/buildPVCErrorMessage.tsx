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

import styles from '@/components/WorkspaceProgress/StartingSteps/StartWorkspace/buildPVCErrorMessage.module.css';
import { Workspace } from '@/services/workspace-adapter';

export const PVC_FULL_FALLBACK_MESSAGE = 'PVC is full, workspace will fail to start.';

/**
 * Builds the alert body shown when a workspace cannot start because its
 * persistent volume is full, with the steps a user can take to recover.
 *
 * @param workspace the workspace that failed to start
 * @param applications cluster applications, used to link the OpenShift console
 * @returns the message node, or {@link PVC_FULL_FALLBACK_MESSAGE} when the workspace is unknown
 */
export function buildPVCErrorMessage(
  workspace: Workspace | undefined,
  applications: ApplicationInfo[],
): React.ReactNode {
  if (!workspace) {
    return PVC_FULL_FALLBACK_MESSAGE;
  }

  const clusterConsole = applications.find(app => app.id === ApplicationId.CLUSTER_CONSOLE);
  // With per-user storage every workspace shares one PVC, so removing old ones
  // frees space. With per-workspace storage each workspace owns its PVC, and
  // deleting the others frees nothing - the hint would be misleading.
  const isPerUserStorage = workspace.storageType === 'per-user';

  return (
    <div>
      <p>PVC is full, workspace &quot;{workspace.name}&quot; will fail to start.</p>
      {clusterConsole && (
        <p className={styles.pvcLink}>
          View PVCs in{' '}
          <a
            href={`${clusterConsole.url}/k8s/ns/${workspace.namespace}/core~v1~PersistentVolumeClaim`}
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenShift Console
          </a>
          .
        </p>
      )}
      <p className={styles.waysToFix}>
        <strong>Ways to fix this issue:</strong>
      </p>
      {isPerUserStorage && (
        <p>
          - Delete old or unused workspaces to free up PVC storage space. This will automatically
          clean up associated PVC resources and free storage.
        </p>
      )}
      <p>- Manually expand PVC size by updating the YAML:</p>
      <pre className={styles.yamlSnippet}>
        {`spec:\n  resources:\n    requests:\n      storage: ①`}
      </pre>
      <p className={styles.snippetLegend}>① - expand PVC size e.g., 10Gi, 20Gi</p>
      <p className={styles.restartHint}>Restart the workspace once PVC definition is updated.</p>
    </div>
  );
}
