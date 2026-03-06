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

export interface IExternalRegistryClient {
  /**
   * List workspace names that have backup images in the registry
   * under the given user namespace path.
   * Returns [] if listing is not supported by this registry type.
   */
  listWorkspaceBackups(namespace: string): Promise<string[]>;
}

export type RegistryType = 'openshift-internal' | 'oci';

/**
 * Determines the registry type from the registry path.
 * OpenShift internal registries use ImageStream API; all other
 * OCI-compatible registries use Docker v2 _catalog.
 */
export function detectRegistryType(registryPath: string): RegistryType {
  try {
    const hostname = registryPath.split('/')[0].split(':')[0];
    if (hostname.includes('openshift-image-registry')) {
      return 'openshift-internal';
    }
    return 'oci';
  } catch {
    return 'oci';
  }
}
