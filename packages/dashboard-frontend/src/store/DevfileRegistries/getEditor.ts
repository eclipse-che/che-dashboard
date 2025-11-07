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

import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { dump } from 'js-yaml';

import devfileApi from '@/services/devfileApi';
import { RootState } from '@/store';
import { actionCreators } from '@/store/DevfileRegistries/actions';
import { EDITOR_DEVFILE_API_QUERY } from '@/store/DevfileRegistries/const';

export async function getEditor(
  editorIdOrPath: string,
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
  getState: () => RootState,
): Promise<{ content?: string; editorYamlUrl: string; error?: string }> {
  let editorYamlUrl: string;

  const state = getState();

  if (/^(https?:\/\/)/.test(editorIdOrPath)) {
    editorYamlUrl = editorIdOrPath;
    let devfileObj = state.devfileRegistries.devfiles[editorYamlUrl];
    if (devfileObj) {
      const content = devfileObj.content;
      const error = devfileObj.error;
      return Object.assign({ content, editorYamlUrl, error });
    }
    await dispatch(actionCreators.requestDevfile(editorYamlUrl));

    const nexState = getState();
    devfileObj = nexState.devfileRegistries.devfiles[editorYamlUrl];
    if (devfileObj) {
      const content = devfileObj.content;
      const error = devfileObj.error;
      return { content, editorYamlUrl, error };
    }
    throw new Error(`Failed to fetch editor yaml by URL: ${editorYamlUrl}.`);
  } else {
    const editors = state.dwPlugins.cmEditors || [];
    const editorId = editorIdOrPath;
    // Find the editor by id
    const editor: devfileApi.Devfile | undefined = editors.find(e => {
      return (
        e.metadata.attributes.publisher +
          '/' +
          e.metadata.name +
          '/' +
          e.metadata.attributes.version ===
        editorId
      );
    });
    if (editor) {
      return {
        content: dump(editor),
        editorYamlUrl: `${EDITOR_DEVFILE_API_QUERY}${editorId}`,
      };
    } else {
      throw new Error(`Failed to fetch editor yaml by id: ${editorIdOrPath}.`);
    }
  }
}
