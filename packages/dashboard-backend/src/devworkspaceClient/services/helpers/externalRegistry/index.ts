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

import {
  detectRegistryType,
  IExternalRegistryClient,
} from '@/devworkspaceClient/services/helpers/externalRegistry/IExternalRegistryClient';
import { NoOpRegistryClient } from '@/devworkspaceClient/services/helpers/externalRegistry/NoOpRegistryClient';
import { QuayRegistryClient } from '@/devworkspaceClient/services/helpers/externalRegistry/QuayRegistryClient';

export type {
  IExternalRegistryClient,
  RegistryType,
} from '@/devworkspaceClient/services/helpers/externalRegistry/IExternalRegistryClient';
export { detectRegistryType } from '@/devworkspaceClient/services/helpers/externalRegistry/IExternalRegistryClient';
export { NoOpRegistryClient } from '@/devworkspaceClient/services/helpers/externalRegistry/NoOpRegistryClient';
export { QuayRegistryClient } from '@/devworkspaceClient/services/helpers/externalRegistry/QuayRegistryClient';

export function createRegistryClient(registryPath: string, token: string): IExternalRegistryClient {
  if (!token) {
    return new NoOpRegistryClient(registryPath);
  }
  const type = detectRegistryType(registryPath);
  switch (type) {
    case 'quay':
      return new QuayRegistryClient(registryPath, token);
    default:
      return new NoOpRegistryClient(registryPath);
  }
}
