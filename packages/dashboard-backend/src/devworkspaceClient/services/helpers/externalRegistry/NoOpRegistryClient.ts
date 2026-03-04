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

import { IExternalRegistryClient } from '@/devworkspaceClient/services/helpers/externalRegistry/IExternalRegistryClient';

export class NoOpRegistryClient implements IExternalRegistryClient {
  private readonly registryPath: string;

  constructor(registryPath: string) {
    this.registryPath = registryPath;
  }

  async listWorkspaceBackups(namespace: string): Promise<string[]> {
    const hostname = this.registryPath.split('/')[0].split(':')[0];
    console.warn(
      `[backup] Registry type for '${hostname}' is not supported for backup listing ` +
        `in namespace '${namespace}'. Falling back to annotation-only discovery.`,
    );
    return [];
  }
}
