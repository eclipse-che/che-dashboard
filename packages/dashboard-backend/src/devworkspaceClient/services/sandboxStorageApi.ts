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
import { SANDBOX_API_GROUP, SANDBOX_API_VERSION } from '@/devworkspaceClient/services/sandboxApi';
import { ISandbox, ISandboxStorageApi } from '@/devworkspaceClient/types';
import { logger } from '@/utils/logger';

const STORAGE_API_ERROR_LABEL = 'CORE_V1_API_ERROR';

/**
 * Name of the volume the Agent Space UI puts on a sandbox's pod template for
 * whichever storage type was chosen. Must stay in step with
 * `STORAGE_VOLUME_NAME` of the Agent Space bundle.
 */
export const SANDBOX_STORAGE_VOLUME = 'sandbox-storage';

/** Marks a claim as provisioned by the dashboard, and says for which sandbox. */
export const SANDBOX_CLAIM_LABEL = 'che.eclipse.org/sandbox';

/** Size of a claim the dashboard provisions. */
export const SANDBOX_CLAIM_SIZE = '5Gi';

/**
 * The one claim name the dashboard will create and delete for a sandbox. Must
 * stay in step with `buildClaimName()` of the Agent Space bundle.
 */
export function buildClaimName(sandboxName: string): string {
  return `sandbox-${sandboxName}`;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * The dashboard-provisioned claim a spec asks for, if it asks for one.
 *
 * A spec is read rather than trusted: it arrives from the browser, and the only
 * claim the dashboard is willing to create or delete on its own is the one
 * named after the sandbox. A manifest pointing the sandbox volume at some other
 * claim describes storage the user manages, which is left alone.
 */
export function readManagedClaimName(
  spec: Record<string, unknown> | undefined,
  sandboxName: string,
): string | undefined {
  const podSpec = asRecord(asRecord(spec?.podTemplate)?.spec);
  const volumes = podSpec?.volumes;
  if (!Array.isArray(volumes)) {
    return undefined;
  }
  const volume = volumes.map(asRecord).find(entry => entry?.name === SANDBOX_STORAGE_VOLUME);
  const claimName = asRecord(volume?.persistentVolumeClaim)?.claimName;
  const expected = buildClaimName(sandboxName);
  return claimName === expected ? expected : undefined;
}

/**
 * Provisions the storage a sandbox's pod template points at.
 *
 * The Sandbox API has a claim template of its own, `spec.volumeClaimTemplates`,
 * which the CRD marks immutable - a sandbox created without it could never be
 * given storage afterwards. The dashboard therefore provisions the claim itself
 * and has the pod template reference it, which is a field that can still be
 * changed while the sandbox is suspended.
 *
 * Every call runs on the requesting user's token, in that user's own namespace,
 * so nothing here widens the RBAC the operator provisions.
 */
export class SandboxStorageApiService implements ISandboxStorageApi {
  private readonly coreV1API: CoreV1API;

  constructor(kc: k8s.KubeConfig) {
    this.coreV1API = prepareCoreV1API(kc);
  }

  private async readClaim(
    namespace: string,
    name: string,
  ): Promise<k8s.V1PersistentVolumeClaim | undefined> {
    try {
      return await this.coreV1API.readNamespacedPersistentVolumeClaim({ namespace, name });
    } catch (e) {
      if (helpers.errors.isKubeClientError(e) && e.code === 404) {
        return undefined;
      }
      throw createError(
        e,
        STORAGE_API_ERROR_LABEL,
        `Unable to read persistent volume claim "${namespace}/${name}"`,
      );
    }
  }

  /**
   * Returns whether the claim had to be created, so a caller whose own write
   * then fails knows whether cleaning up would destroy somebody's data.
   */
  async ensureClaim(namespace: string, sandboxName: string, claimName: string): Promise<boolean> {
    if (await this.readClaim(namespace, claimName)) {
      return false;
    }

    const body: k8s.V1PersistentVolumeClaim = {
      apiVersion: 'v1',
      kind: 'PersistentVolumeClaim',
      metadata: {
        name: claimName,
        namespace,
        labels: { [SANDBOX_CLAIM_LABEL]: sandboxName },
      },
      spec: {
        // One pod at a time writes to it, which every storage class supports;
        // asking for more would rule out the common ReadWriteOnce-only cluster.
        accessModes: ['ReadWriteOnce'],
        resources: { requests: { storage: SANDBOX_CLAIM_SIZE } },
      },
    };

    try {
      await this.coreV1API.createNamespacedPersistentVolumeClaim({ namespace, body });
      return true;
    } catch (e) {
      // Two requests can pass the read above together; the loser finding the
      // claim already there has got what it asked for.
      if (helpers.errors.isKubeClientError(e) && e.code === 409) {
        return false;
      }
      throw createError(
        e,
        STORAGE_API_ERROR_LABEL,
        `Unable to create persistent volume claim "${namespace}/${claimName}"`,
      );
    }
  }

  /**
   * Hands the claim to the sandbox, so deleting the sandbox takes the claim with
   * it however the deletion is done - through this dashboard, through kubectl,
   * or by the namespace going away.
   */
  async adoptClaim(namespace: string, sandbox: ISandbox): Promise<void> {
    const sandboxName = sandbox.metadata?.name;
    const uid = sandbox.metadata?.uid;
    if (!sandboxName || !uid) {
      return;
    }

    const claimName = buildClaimName(sandboxName);
    const body: k8s.V1PersistentVolumeClaim = {
      metadata: {
        ownerReferences: [
          {
            apiVersion: `${SANDBOX_API_GROUP}/${SANDBOX_API_VERSION}`,
            kind: 'Sandbox',
            name: sandboxName,
            uid,
            blockOwnerDeletion: false,
          },
        ],
      },
    };

    try {
      await this.coreV1API.patchNamespacedPersistentVolumeClaim({
        namespace,
        name: claimName,
        body,
      });
    } catch (e) {
      // The sandbox exists and has its storage; failing the request now would
      // report a creation that in fact succeeded. Worst case the claim outlives
      // the sandbox, and deleting the sandbox through the dashboard still
      // removes it.
      logger.warn(
        helpers.errors.getMessage(e),
        `Unable to set the owner of persistent volume claim "${namespace}/${claimName}".`,
      );
    }
  }

  /**
   * Removes the claim provisioned for a sandbox.
   *
   * Only a claim carrying the dashboard's label is touched: a user who points
   * the sandbox volume at a claim of their own keeps it, whatever the sandbox
   * goes on to do.
   */
  async deleteClaim(namespace: string, sandboxName: string): Promise<void> {
    const claimName = buildClaimName(sandboxName);
    const claim = await this.readClaim(namespace, claimName);
    if (claim?.metadata?.labels?.[SANDBOX_CLAIM_LABEL] !== sandboxName) {
      return;
    }

    try {
      await this.coreV1API.deleteNamespacedPersistentVolumeClaim({
        namespace,
        name: claimName,
      });
    } catch (e) {
      if (helpers.errors.isKubeClientError(e) && e.code === 404) {
        return;
      }
      throw createError(
        e,
        STORAGE_API_ERROR_LABEL,
        `Unable to delete persistent volume claim "${namespace}/${claimName}"`,
      );
    }
  }
}
