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

import { ThunkDispatch } from 'redux-thunk';

import { dump } from 'js-yaml';
import { actionCreators, KnownAction } from '@/store/DevfileRegistries/index';
import { AppState } from '@/store/index';
import devfileApi from '@/services/devfileApi';

export async function getEditor(
  editorIdOrPath: string,
  dispatch: ThunkDispatch<AppState, unknown, KnownAction>,
  getState: () => AppState,
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
      return Object.assign({ content, editorYamlUrl, error });
    }
    throw new Error(`Failed to fetch editor yaml by URL: ${editorYamlUrl}.`);
  } else {
    const editors = state.dwPlugins.cmEditors || [];
    let editor: devfileApi.Devfile | undefined;
    for (const e of editors) {
      if (!e.metadata.name)
        throw new Error(
          `Missing metadata.name attribute in the editor yaml file: ${editorIdOrPath}.`,
        );
      if (!e.metadata.attributes.publisher)
        throw new Error(
          `Missing metadata.attributes.publisher attribute in the editor yaml file: ${editorIdOrPath}.`,
        );
      if (!e.metadata.attributes.version)
        throw new Error(
          `Missing metadata.attributes.version attribute in the editor yaml file: ${editorIdOrPath}.`,
        );
      if (
        e.metadata.attributes.publisher +
          '/' +
          e.metadata.name +
          '/' +
          e.metadata.attributes.version ===
        editorIdOrPath
      ) {
        editor = e;
        return Object.assign({ content: dump(editor), editorIdOrPath });
      }
    }
  }

  throw new Error(`Failed to fetch editor yaml by URL: ${editorIdOrPath}.`);
}
