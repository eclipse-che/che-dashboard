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

import common from '@eclipse-che/common';
import { createAction } from '@reduxjs/toolkit';

import { che } from '@/services/models';
import { AppThunk } from '@/store';
import { convertToEditorPlugin } from '@/store/Plugins/chePlugins/helpers';
import { devWorkspacePluginsActionCreators } from '@/store/Plugins/devWorkspacePlugins';
import { verifyAuthorized } from '@/store/SanityCheck';

export const pluginsRequestAction = createAction('plugins/request');
export const pluginsReceiveAction = createAction<che.Plugin[]>('plugins/receive');
export const pluginsErrorAction = createAction<string>('plugins/error');

export const actionCreators = {
  requestPlugins:
    (): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(pluginsRequestAction());

        // request editors from config map
        await dispatch(devWorkspacePluginsActionCreators.requestEditors());

        const state = getState();
        const editors = state.dwPlugins.cmEditors || [];
        const editorsPlugins = editors.map(editor => convertToEditorPlugin(editor));

        dispatch(pluginsReceiveAction(editorsPlugins));
      } catch (e) {
        const errorMessage = common.helpers.errors.getMessage(e);
        dispatch(pluginsErrorAction(errorMessage));
        throw e;
      }
    },
};
