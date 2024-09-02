/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { DevWorkspaceClient, DevWorkspaceSingletonClient } from '@/devworkspaceClient';
import { DwClientProvider } from '@/services/kubeclient/dwClientProvider';
import { DwSingletonClientProvider } from '@/services/kubeclient/dwSingletonClientProvider';

/**
 * Creates DevWorkspace Client depending on the context for the specified request.
 */
export function getDevWorkspaceClient(token: string): DevWorkspaceClient {
  const dwClientProvider = new DwClientProvider();
  return dwClientProvider.getDWClient(token);
}

export function getDevWorkspaceSingletonClient(): DevWorkspaceSingletonClient {
  const dwSingletonClientProvider = DwSingletonClientProvider.getInstance();
  return dwSingletonClientProvider.getDWSingletonClient();
}
