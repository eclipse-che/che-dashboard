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

import { createAction } from '@reduxjs/toolkit';

import { createSandboxClient } from '@/services/client';
import { setSandboxClient } from '@/services/client/instance';
import { fetchClusterConsoleUrl } from '@/services/clusterInfo';
import { AgentSpaceConfig, loadConfig } from '@/services/config';
import { resolveNamespace } from '@/services/namespace';
import { AgentSandboxClient, SandboxError, toSandboxError } from '@/services/types';
import { AppThunk } from '@/store';

export interface BootstrapPayload {
  config: AgentSpaceConfig;
  namespace: string;
  clientMode: AgentSandboxClient['mode'];
  /** Where the cluster console lives, or empty when there is none. */
  clusterConsoleUrl: string;
}

export const bootstrapRequestAction = createAction('bootstrap/request');
export const bootstrapReceiveAction = createAction<BootstrapPayload>('bootstrap/receive');
export const bootstrapErrorAction = createAction<SandboxError>('bootstrap/receiveError');

export const actionCreators = {
  /**
   * Resolves the runtime configuration, the API client and the namespace.
   *
   * Unlike the other thunks this one does not rethrow: the failure is the
   * application's whole state at that point, and `App` renders it from the
   * store together with a retry.
   */
  requestBootstrap:
    (): AppThunk =>
    async (dispatch): Promise<void> => {
      try {
        dispatch(bootstrapRequestAction());

        const config = await loadConfig();
        const client = await createSandboxClient(config);
        setSandboxClient(client);
        const namespace = await resolveNamespace(config, client);
        const clusterConsoleUrl = await fetchClusterConsoleUrl(config.kubeApiBaseUrl);

        dispatch(
          bootstrapReceiveAction({
            config,
            namespace,
            clientMode: client.mode,
            clusterConsoleUrl,
          }),
        );
      } catch (e) {
        setSandboxClient(undefined);
        dispatch(bootstrapErrorAction(toSandboxError(e)));
      }
    },
};
