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

import * as k8s from '@kubernetes/client-node';

import { DevWorkspaceClient } from '@/devworkspaceClient';
import { DwClientProvider } from '@/services/kubeclient/dwClientProvider';
import { KubeConfigProvider } from '@/services/kubeclient/kubeConfigProvider';

/**
 * Creates DevWorkspace Client depending on the context for the specified request.
 */
export function getDevWorkspaceClient(token: string): DevWorkspaceClient {
  const dwClientProvider = new DwClientProvider();
  return dwClientProvider.getDWClient(token);
}

/**
 * Returns a KubeConfig configured with the user's token.
 */
export function getKubeConfig(token: string): k8s.KubeConfig {
  const provider = new KubeConfigProvider();
  return provider.getKubeConfig(token);
}
