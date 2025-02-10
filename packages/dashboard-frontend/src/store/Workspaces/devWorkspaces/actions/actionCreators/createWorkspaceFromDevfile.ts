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
import { dump } from 'js-yaml';

import { fetchResources } from '@/services/backend-client/devworkspaceResourcesApi';
import { DevfileAdapter } from '@/services/devfile/adapter';
import devfileApi from '@/services/devfileApi';
import { FactoryParams } from '@/services/helpers/factoryFlow/buildFactoryParams';
import { loadResourcesContent } from '@/services/registry/resources';
import {
  COMPONENT_UPDATE_POLICY,
  DEVWORKSPACE_DEVFILE,
  DEVWORKSPACE_METADATA_ANNOTATION,
  REGISTRY_URL,
} from '@/services/workspace-client/devworkspace/devWorkspaceClient';
import { AppThunk } from '@/store';
import { getEditor } from '@/store/DevfileRegistries/getEditor';
import { verifyAuthorized } from '@/store/SanityCheck';
import { actionCreators } from '@/store/Workspaces/devWorkspaces/actions';
import { updateEditorDevfile } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers/editorImage';
import { getCustomEditor } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers/getCustomEditor';
import {
  devWorkspacesErrorAction,
  devWorkspacesRequestAction,
} from '@/store/Workspaces/devWorkspaces/actions/actions';

export const createWorkspaceFromDevfile =
  (
    devfile: devfileApi.Devfile,
    params: Partial<FactoryParams>,
    optionalFilesContent: {
      [fileName: string]: string;
    },
  ): AppThunk =>
  async (dispatch, getState) => {
    const state = getState();
    let devWorkspaceResource: devfileApi.DevWorkspace;
    let devWorkspaceTemplateResource: devfileApi.DevWorkspaceTemplate;
    let editorContent: string | undefined;
    let editorYamlUrl: string | undefined;
    // do we have an optional editor parameter ?
    let editor = params.cheEditor;
    if (editor) {
      const response = await getEditor(editor, dispatch, getState);
      if (response.content) {
        editorContent = response.content;
        editorYamlUrl = response.editorYamlUrl;
      } else {
        throw new Error(response.error);
      }
    } else {
      // do we have the custom editor in `.che/che-editor.yaml` ?
      try {
        editorContent = await getCustomEditor(optionalFilesContent, dispatch, getState);
        if (!editorContent) {
          console.warn('No custom editor found');
        }
      } catch (e) {
        console.warn('Failed to get custom editor', e);
      }
      if (!editorContent) {
        const defaultsEditor = state.dwServerConfig.config.defaults.editor;
        if (!defaultsEditor) {
          throw new Error('Cannot define default editor');
        }
        const response = await getEditor(defaultsEditor, dispatch, getState);
        if (response.content) {
          editorContent = response.content;
          editorYamlUrl = response.editorYamlUrl;
        } else {
          throw new Error(response.error);
        }
        editor = defaultsEditor;
        console.debug(`Using default editor ${defaultsEditor}`);
      }
    }

    try {
      await verifyAuthorized(dispatch, getState);

      dispatch(devWorkspacesRequestAction());

      editorContent = updateEditorDevfile(editorContent, params.editorImage);
      const resourcesContent = await fetchResources({
        devfileContent: dump(devfile),
        editorPath: undefined,
        editorContent: editorContent,
      });
      const resources = loadResourcesContent(resourcesContent);
      devWorkspaceResource = resources.find(
        resource => resource.kind === 'DevWorkspace',
      ) as devfileApi.DevWorkspace;
      if (devWorkspaceResource === undefined) {
        throw new Error('Failed to find a DevWorkspace in the fetched resources.');
      }
      if (devWorkspaceResource.metadata) {
        if (!devWorkspaceResource.metadata.annotations) {
          devWorkspaceResource.metadata.annotations = {};
        }
      }
      devWorkspaceTemplateResource = resources.find(
        resource => resource.kind === 'DevWorkspaceTemplate',
      ) as devfileApi.DevWorkspaceTemplate;
      if (devWorkspaceTemplateResource === undefined) {
        throw new Error('Failed to find a DevWorkspaceTemplate in the fetched resources.');
      }
      if (editorYamlUrl && devWorkspaceTemplateResource.metadata) {
        if (!devWorkspaceTemplateResource.metadata.annotations) {
          devWorkspaceTemplateResource.metadata.annotations = {};
        }
        devWorkspaceTemplateResource.metadata.annotations[COMPONENT_UPDATE_POLICY] = 'managed';
        devWorkspaceTemplateResource.metadata.annotations[REGISTRY_URL] = editorYamlUrl;
      }
    } catch (e) {
      const errorMessage = common.helpers.errors.getMessage(e);
      dispatch(devWorkspacesErrorAction(errorMessage));
      throw e;
    }

    // TODO: remove this after merge of https://github.com/devfile/devworkspace-generator/pull/118
    if (!devWorkspaceResource.metadata.annotations) {
      devWorkspaceResource.metadata.annotations = {};
    }
    const originDevfileStr =
      DevfileAdapter.getAttributes(devfile)?.[DEVWORKSPACE_METADATA_ANNOTATION]?.[
        DEVWORKSPACE_DEVFILE
      ];
    if (originDevfileStr) {
      devWorkspaceResource.metadata.annotations[DEVWORKSPACE_DEVFILE] = originDevfileStr;
    }

    await dispatch(
      actionCreators.createWorkspaceFromResources(
        devWorkspaceResource,
        devWorkspaceTemplateResource,
        params,
        editor ? editor : editorContent,
      ),
    );
  };
