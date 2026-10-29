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

import { KubeSandboxClient } from '@/services/client/kubeClient';
import { MockSandboxClient } from '@/services/client/mockClient';
import { AgentSpaceConfig } from '@/services/config';
import { AgentSandboxClient } from '@/services/types';

export { KubeSandboxClient } from '@/services/client/kubeClient';
export { MockSandboxClient } from '@/services/client/mockClient';

/**
 * Picks the client to talk to.
 *
 * In `auto` mode the Sandbox API group is probed once at startup; when it is
 * not served - no controller installed, or the user cannot reach it - the UI
 * falls back to the in-memory client instead of showing an empty error page.
 */
export async function createSandboxClient(config: AgentSpaceConfig): Promise<AgentSandboxClient> {
  if (config.mode === 'mock') {
    return new MockSandboxClient(config.namespace || undefined);
  }

  const kubeClient = new KubeSandboxClient(config.kubeApiBaseUrl);
  if (config.mode === 'cluster') {
    return kubeClient;
  }

  return (await kubeClient.isAvailable())
    ? kubeClient
    : new MockSandboxClient(config.namespace || undefined);
}
