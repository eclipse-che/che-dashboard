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

import { AgentSandboxClient } from '@/services/types';

/**
 * The API client lives next to the store rather than inside it: it holds a
 * live connection and is not serializable, so putting it in Redux state would
 * break the serializability check the dashboard store also enforces.
 *
 * This mirrors how the dashboard reaches its backend - thunks import the API
 * module instead of receiving a client through state.
 */
let client: AgentSandboxClient | undefined;

export function setSandboxClient(next: AgentSandboxClient | undefined): void {
  client = next;
}

/**
 * @throws when called before the bootstrap thunk has resolved a client; every
 * page is rendered behind that gate, so this is a programming error.
 */
export function getSandboxClient(): AgentSandboxClient {
  if (client === undefined) {
    throw new Error('The Agent Sandbox client is used before Agent Space finished starting up.');
  }
  return client;
}
