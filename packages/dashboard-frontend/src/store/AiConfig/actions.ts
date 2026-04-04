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

function buildKeyExistsMap(
  tools: api.AiToolDefinition[],
  sanitizedIdsWithKey: string[],
): Record<string, boolean> {
  const keyExists: Record<string, boolean> = {};
  for (const tool of tools) {
    keyExists[tool.providerId] = sanitizedIdsWithKey.includes(tool.providerId.replace(/\//g, '-'));
  }
  return keyExists;
}

export const aiConfigRequestAction = createAction('aiConfig/request');

export const aiConfigKeyStatusReceiveAction = createAction<Record<string, boolean>>(
  'aiConfig/keyStatusReceive',
);

export const aiConfigErrorAction = createAction<string>('aiConfig/error');

async function refreshKeyStatus(
  dispatch: Parameters<AppThunk>[0],
  getState: Parameters<AppThunk>[1],
): Promise<void> {
  const state = getState();
  const namespace = selectDefaultNamespace(state).name;
  const tools = selectAiTools(state);
  if (namespace && tools.length > 0) {
    const sanitizedIds = await fetchAiProviderKeyStatus(namespace);
    dispatch(aiConfigKeyStatusReceiveAction(buildKeyExistsMap(tools, sanitizedIds)));
  }
}

export const actionCreators = {
  requestAiProviderKeyStatus: (): AppThunk => async (dispatch, getState) => {
    try {
      await verifyAuthorized(dispatch, getState);

      dispatch(aiConfigRequestAction());

      await refreshKeyStatus(dispatch, getState);
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
        const tools = selectAiTools(state);
        const tool = tools.find(t => t.providerId === toolId);
        const envVarName = tool?.envVarName ?? '';
        await saveAiProviderKey(namespace, toolId, envVarName, apiKey);
        await refreshKeyStatus(dispatch, getState);
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

        const namespace = selectDefaultNamespace(getState()).name;
        await deleteAiProviderKey(namespace, toolId);
        await refreshKeyStatus(dispatch, getState);
      } catch (e) {
        const errorMessage = helpers.errors.getMessage(e);
        dispatch(aiConfigErrorAction(errorMessage));
        throw e;
      }
    },
};
