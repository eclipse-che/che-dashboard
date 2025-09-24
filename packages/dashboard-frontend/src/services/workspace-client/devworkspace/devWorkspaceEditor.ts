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

import { load } from 'js-yaml';

import devfileApi, { isDevfileV2 } from '@/services/devfileApi';
import { ICheEditorYaml } from '@/services/workspace-client/devworkspace/devWorkspaceClient';
import { EDITOR_DEVFILE_API_QUERY } from '@/store/DevfileRegistries/const';

export async function fetchEditor(
  url: string,
  requestCallback: <T>(location: string) => Promise<T>,
  isCheEditorYamlFile?: boolean,
): Promise<devfileApi.Devfile | undefined> {
  let editor: devfileApi.Devfile | undefined = undefined;
  let editorContent: string | devfileApi.Devfile | undefined = undefined;
  try {
    editorContent = await requestCallback<string | devfileApi.Devfile>(url);
  } catch (e) {
    console.warn(`Failed to fetch editor yaml by URL: ${url}.`);
  }
  if (typeof editorContent === 'string') {
    if (isCheEditorYamlFile) {
      const cheEditorYaml = load(editorContent) as ICheEditorYaml;
      let repositoryEditorYaml: devfileApi.Devfile | undefined;
      let editorReference: string | undefined;
      if (cheEditorYaml?.inline) {
        repositoryEditorYaml = cheEditorYaml.inline;
      } else if (cheEditorYaml?.id) {
        if (cheEditorYaml?.registryUrl) {
          editorReference = `${cheEditorYaml.registryUrl}/plugins/${cheEditorYaml.id}/devfile.yaml`;
        } else {
          editorReference = `${EDITOR_DEVFILE_API_QUERY}${cheEditorYaml?.id}`;
        }
      } else if (cheEditorYaml?.reference) {
        editorReference = cheEditorYaml.reference;
      }
      if (editorReference) {
        try {
          const devfileContent = await requestCallback<string>(editorReference);
          const devfile =
            typeof devfileContent === 'string' ? load(devfileContent) : devfileContent;
          repositoryEditorYaml = isDevfileV2(devfile) ? devfile : undefined;
        } catch (e) {
          console.warn(`Failed to fetch a devfile from URL: ${url}, reason: ` + e);
        }
      }
      if (cheEditorYaml?.override) {
        cheEditorYaml.override.containers?.forEach(container => {
          const matchingComponent = repositoryEditorYaml?.components
            ? repositoryEditorYaml.components.find(component => component.name === container.name)
            : undefined;
          if (matchingComponent?.container) {
            Object.keys(container).forEach(property => {
              if (matchingComponent.container?.[property] && property !== 'name') {
                matchingComponent.container[property] = container[property];
              }
            });
          }
        });
      }
      editor = isDevfileV2(repositoryEditorYaml) ? repositoryEditorYaml : undefined;
    } else {
      const devfile = load(editorContent);
      editor = isDevfileV2(devfile) ? devfile : undefined;
    }
  } else if (typeof editorContent === 'object') {
    editor = isDevfileV2(editorContent) ? editorContent : undefined;
  }

  return editor;
}
