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

import { actionCreators, KnownAction } from '@/store/DevfileRegistries/index';
import { AppState } from '@/store/index';

export async function getEditor(
  editorIdOrPath: string,
  dispatch: ThunkDispatch<AppState, unknown, KnownAction>,
  getState: () => AppState,
  pluginRegistryUrl?: string,
): Promise<{ content?: string; editorYamlUrl: string; error?: string }> {
  let editorYamlUrl: string;

  if (/^(https?:\/\/)/.test(editorIdOrPath)) {
    editorYamlUrl = editorIdOrPath;
  } else {
    if (!pluginRegistryUrl) {
      throw new Error('Plugin registry URL is required.');
    }
    editorYamlUrl = `${pluginRegistryUrl}/plugins/${editorIdOrPath}/devfile.yaml`;
  }

  const state = getState();
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
}
