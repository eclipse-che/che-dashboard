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

import { api, helpers } from '@eclipse-che/common';
import { createAction } from '@reduxjs/toolkit';

import {
  deleteAiProviderKey,
  fetchAiProviderKeyStatus,
  saveAiProviderKey,
} from '@/services/backend-client/aiConfigApi';
import { AppThunk } from '@/store';
import { selectAiTools } from '@/store/AiConfig/selectors';
import { selectDefaultNamespace } from '@/store/InfrastructureNamespaces/selectors';
import { verifyAuthorized } from '@/store/SanityCheck';
import { selectServerConfigState } from '@/store/ServerConfig/selectors';

function buildKeyExistsMap(
  tools: api.AiToolDefinition[],
  sanitizedIdsWithKey: string[],
): Record<string, boolean> {
  const keyExists: Record<string, boolean> = {};
  for (const tool of tools) {
    keyExists[tool.id] = sanitizedIdsWithKey.includes(tool.id.replace(/\//g, '-'));
  }
  return keyExists;
}

export const aiConfigRequestAction = createAction('aiConfig/request');

export interface AiConfigReceivePayload {
  providers: api.AiProviderDefinition[];
  tools: api.AiToolDefinition[];
  defaultProviderId: string | undefined;
}
export const aiConfigReceiveAction = createAction<AiConfigReceivePayload>('aiConfig/receive');

export const aiConfigKeyStatusReceiveAction = createAction<Record<string, boolean>>(
  'aiConfig/keyStatusReceive',
);

export const aiConfigErrorAction = createAction<string>('aiConfig/error');

export const actionCreators = {
  requestAiConfig: (): AppThunk => async (dispatch, getState) => {
    try {
      await verifyAuthorized(dispatch, getState);

      dispatch(aiConfigRequestAction());

      const state = getState();
      const serverConfig = selectServerConfigState(state)?.config;
      const providers = serverConfig?.aiProviders ?? [];
      const tools = serverConfig?.aiTools ?? [];
      const defaultProviderId = serverConfig?.defaultAiProvider;

      dispatch(
        aiConfigReceiveAction({
          providers,
          tools,
          defaultProviderId,
        }),
      );

      // Fetch key status keyed by tool id
      const namespace = selectDefaultNamespace(state).name;
      if (namespace && tools.length > 0) {
        const sanitizedIds = await fetchAiProviderKeyStatus(namespace);
        dispatch(aiConfigKeyStatusReceiveAction(buildKeyExistsMap(tools, sanitizedIds)));
      }
    } catch (e) {
      const errorMessage = helpers.errors.getMessage(e);
      dispatch(aiConfigErrorAction(errorMessage));
      throw e;
    }
  },

  saveAiProviderKey:
    (toolId: string, apiKey: string): AppThunk =>
    async (dispatch, getState) => {
      try {
        await verifyAuthorized(dispatch, getState);
        dispatch(aiConfigRequestAction());
        const state = getState();
        const namespace = selectDefaultNamespace(state).name;
        await saveAiProviderKey(namespace, toolId, apiKey);
        const sanitizedIds = await fetchAiProviderKeyStatus(namespace);
        const tools = selectAiTools(state);
        dispatch(aiConfigKeyStatusReceiveAction(buildKeyExistsMap(tools, sanitizedIds)));
      } catch (e) {
        const errorMessage = helpers.errors.getMessage(e);
        dispatch(aiConfigErrorAction(errorMessage));
        throw e;
      }
    },

  deleteAiProviderKey:
    (toolId: string): AppThunk =>
    async (dispatch, getState) => {
      try {
        await verifyAuthorized(dispatch, getState);
        dispatch(aiConfigRequestAction());
        const state = getState();
        const namespace = selectDefaultNamespace(state).name;
        await deleteAiProviderKey(namespace, toolId);
        const sanitizedIds = await fetchAiProviderKeyStatus(namespace);
        const tools = selectAiTools(state);
        dispatch(aiConfigKeyStatusReceiveAction(buildKeyExistsMap(tools, sanitizedIds)));
      } catch (e) {
        const errorMessage = helpers.errors.getMessage(e);
        dispatch(aiConfigErrorAction(errorMessage));
        throw e;
      }
    },
};
