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
import { dump, load } from 'js-yaml';

import devfileApi, { isDevfileV2 } from '@/services/devfileApi';
import { ICheEditorYaml } from '@/services/workspace-client/devworkspace/devWorkspaceClient';
import { CHE_EDITOR_YAML_PATH } from '@/services/workspace-client/helpers';
import { RootState } from '@/store';
import { getEditor } from '@/store/DevfileRegistries/getEditor';

/**
 * Look for the custom editor in .che/che-editor.yaml
 */
export async function getCustomEditor(
  optionalFilesContent: { [fileName: string]: { location: string; content: string } | undefined },
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
  getState: () => RootState,
): Promise<string | undefined> {
  // let editorsDevfile: devfileApi.Devfile | undefined;

  // do we have a custom editor specified in the repository ?
  const cheEditorYaml = optionalFilesContent[CHE_EDITOR_YAML_PATH]?.content
    ? (load(optionalFilesContent[CHE_EDITOR_YAML_PATH].content) as ICheEditorYaml)
    : undefined;

  if (!cheEditorYaml) {
    return undefined;
  }
  let repositoryEditorYaml: devfileApi.Devfile | undefined;
  let editorReference: string | undefined;
  // it's an inlined editor, use the inline content
  if (cheEditorYaml.inline) {
    repositoryEditorYaml = cheEditorYaml.inline;
  } else if (cheEditorYaml.id) {
    if (cheEditorYaml.registryUrl) {
      editorReference = `${cheEditorYaml.registryUrl}/plugins/${cheEditorYaml.id}/devfile.yaml`;
    } else {
      editorReference = cheEditorYaml.id;
    }
  } else if (cheEditorYaml.reference) {
    editorReference = cheEditorYaml.reference;
  }
  if (editorReference) {
    const response = await getEditor(editorReference, dispatch, getState);
    if (response.content) {
      const yaml = load(response.content);
      repositoryEditorYaml = isDevfileV2(yaml) ? yaml : undefined;
    } else {
      throw new Error(response.error);
    }
  }

  // if there are some overrides, apply them
  if (cheEditorYaml.override) {
    cheEditorYaml.override.containers?.forEach(container => {
      // search matching component
      const matchingComponent = repositoryEditorYaml?.components
        ? repositoryEditorYaml.components.find(component => component.name === container.name)
        : undefined;
      if (matchingComponent?.container) {
        // apply overrides except the name
        Object.keys(container).forEach(property => {
          if (matchingComponent.container?.[property] && property !== 'name') {
            matchingComponent.container[property] = container[property];
          }
        });
      }
    });
  }

  if (!repositoryEditorYaml) {
    throw new Error(
      'Failed to analyze the editor devfile inside the repository, reason: Missing id, reference or inline content.',
    );
  }
  // Use the repository defined editor
  if (!repositoryEditorYaml.metadata || !repositoryEditorYaml.metadata.name) {
    throw new Error(
      'Failed to analyze the editor devfile, reason: Missing metadata.name attribute in the editor yaml file.',
    );
  }
  return dump(repositoryEditorYaml);
}
