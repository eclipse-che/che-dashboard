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

import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { dump } from 'js-yaml';

import devfileApi from '@/services/devfileApi';
import { RootState } from '@/store';
import { actionCreators } from '@/store/DevfileRegistries/actions';

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
        editorYamlUrl: `http://127.0.0.1:8080/dashboard/api/editors/devfile?che-editor=${editorId}`,
      };
    } else {
      throw new Error(`Failed to fetch editor yaml by id: ${editorIdOrPath}.`);
    }
  }
}
