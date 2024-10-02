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
  optionalFilesContent: { [fileName: string]: string },
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
  getState: () => RootState,
): Promise<string | undefined> {
  let editorsDevfile: devfileApi.Devfile | undefined;

  // do we have a custom editor specified in the repository ?
  const cheEditorYaml = optionalFilesContent[CHE_EDITOR_YAML_PATH]
    ? (load(optionalFilesContent[CHE_EDITOR_YAML_PATH]) as ICheEditorYaml)
    : undefined;

  if (cheEditorYaml) {
    // check the content of cheEditor file
    console.debug('Using the repository .che/che-editor.yaml file', cheEditorYaml);

    let repositoryEditorYaml: devfileApi.Devfile | undefined;
    let editorReference: string | undefined;
    // it's an inlined editor, use the inline content
    if (cheEditorYaml.inline) {
      console.debug('Using the inline content of the repository editor');
      repositoryEditorYaml = cheEditorYaml.inline;
    } else if (cheEditorYaml.id) {
      // load the content of this editor
      console.debug(`Loading editor from its id ${cheEditorYaml.id}`);

      // registryUrl ?
      if (cheEditorYaml.registryUrl) {
        editorReference = `${cheEditorYaml.registryUrl}/plugins/${cheEditorYaml.id}/devfile.yaml`;
      } else {
        editorReference = cheEditorYaml.id;
      }
    } else if (cheEditorYaml.reference) {
      // load the content of this editor
      console.debug(`Loading editor from reference ${cheEditorYaml.reference}`);
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
      console.debug(`Applying overrides ${JSON.stringify(cheEditorYaml.override)}...`);
      cheEditorYaml.override.containers?.forEach(container => {
        // search matching component
        const matchingComponent = repositoryEditorYaml?.components
          ? repositoryEditorYaml.components.find(component => component.name === container.name)
          : undefined;
        if (matchingComponent?.container) {
          // apply overrides except the name
          Object.keys(container).forEach(property => {
            if (matchingComponent.container?.[property] && property !== 'name') {
              console.debug(
                `Updating property from ${matchingComponent.container[property]} to ${container[property]}`,
              );
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
    editorsDevfile = repositoryEditorYaml;
  }

  if (editorsDevfile) {
    if (!editorsDevfile.metadata || !editorsDevfile.metadata.name) {
      throw new Error(
        'Failed to analyze the editor devfile, reason: Missing metadata.name attribute in the editor yaml file.',
      );
    }
    return dump(editorsDevfile);
  }

  return undefined;
}
